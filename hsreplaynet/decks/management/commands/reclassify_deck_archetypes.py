import json
import time
from collections import defaultdict
from datetime import date, datetime, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from hearthstone.enums import CardClass, FormatType
from hsarchetypes import classify_deck
from sqlalchemy import Date, Integer, String
from sqlalchemy.sql import bindparam, text

from hsreplaynet.decks.models import Archetype, ClusterSnapshot, Deck
from hsreplaynet.utils.aws import redshift
from hsreplaynet.utils.aws.clients import FIREHOSE


REDSHIFT_QUERY = text("""
	WITH deck_player_class AS (
		SELECT
			t.deck_id, t.player_class
		FROM (
			SELECT
				p.proxy_deck_id AS deck_id,
				p.player_class,
				ROW_NUMBER() OVER (
					PARTITION BY p.proxy_deck_id ORDER BY count(*) DESC
				) AS times_played_rank
			FROM player p
			WHERE p.game_date BETWEEN :start_date AND :end_date
			GROUP BY p.proxy_deck_id, p.player_class
		) t
		WHERE t.times_played_rank = 1
	)
	SELECT
		p.game_type,
		p.proxy_deck_id AS deck_id,
		max(dpc.player_class) AS player_class,
		max(m.archetype_id) AS archetype_id,
		max(p.deck_list) AS deck_list
	FROM player p
	JOIN deck_player_class dpc ON dpc.deck_id = p.proxy_deck_id
	LEFT JOIN deck_archetype_map m ON m.deck_id = p.proxy_deck_id
	WHERE p.game_date BETWEEN :start_date AND :end_date
	AND p.game_type IN (2, 30)
	GROUP BY p.game_type, p.proxy_deck_id
	ORDER BY p.game_type;
""").bindparams(
	bindparam("start_date", type_=Date),
	bindparam("end_date", type_=Date),
).columns(
	game_type=Integer,
	player_class=Integer,
	deck_id=Integer,
	deck_list=String,
	archetype_id=Integer
)


class Command(BaseCommand):
	def __init__(self, *args, **kwargs):
		self.archetype_map = {}
		self.db_archetypes_to_update = {}
		self.firehose_buffer = []
		self.timestamp = datetime.now().isoformat(sep=" ")
		self.signature_weights = {
			FormatType.FT_WILD: {},
			FormatType.FT_STANDARD: {},
		}
		self.firehose_batch_size = 500
		super().__init__(*args, **kwargs)

	def add_arguments(self, parser):
		parser.add_argument("--lookback", nargs="?", type=int, default=7)

	def get_archetype_name(self, archetype_id):
		if archetype_id in self.archetype_map:
			return self.archetype_map[archetype_id].name
		return "(none)"

	def handle(self, *args, **options):
		conn = redshift.get_new_redshift_connection()

		end_ts = date.today()
		start_ts = end_ts - timedelta(days=options["lookback"])

		params = {
			"start_date": start_ts,
			"end_date": end_ts
		}
		compiled_statement = REDSHIFT_QUERY.params(params).compile(bind=conn)

		# Format -> CardClass -> [a.id]
		archetype_ids_for_player_class = {
			FormatType.FT_STANDARD: defaultdict(list),
			FormatType.FT_WILD: defaultdict(list)
		}
		for card_class in CardClass:
			if 2 <= card_class <= 10:
				for a in Archetype.objects.live().filter(player_class=card_class):
					if a.active_in_standard:
						self.archetype_map[a.id] = a
						archetype_ids_for_player_class[
							FormatType.FT_STANDARD
						][card_class].append(a.id)
					if a.active_in_wild:
						self.archetype_map[a.id] = a.name
						archetype_ids_for_player_class[
							FormatType.FT_WILD
						][card_class].append(a.id)

				# Standard Signature Weights
				if len(archetype_ids_for_player_class[FormatType.FT_STANDARD][card_class]):
					signature_weight_values = ClusterSnapshot.objects.get_signature_weights(
						FormatType.FT_STANDARD,
						card_class,
						archetype_ids_for_player_class[FormatType.FT_STANDARD][card_class]
					)
					self.signature_weights[
						FormatType.FT_STANDARD
					][card_class] = signature_weight_values

				# Wild Signature Weights
				if len(archetype_ids_for_player_class[FormatType.FT_WILD][card_class]):
					signature_weight_values = ClusterSnapshot.objects.get_signature_weights(
						FormatType.FT_WILD,
						card_class,
						archetype_ids_for_player_class[FormatType.FT_WILD][card_class]
					)
					self.signature_weights[
						FormatType.FormatType.FT_WILD
					][card_class] = signature_weight_values

		result_set = list(conn.execute(compiled_statement))
		total_rows = len(result_set)
		self.stdout.write("%i decks to update" % (total_rows))

		for counter, row in enumerate(result_set):
			deck_id = row["deck_id"]
			if counter % 100000 == 0:
				self.flush_db_buffer()
				self.flush_firehose_buffer()

			if deck_id is None:
				self.stderr.write("Got deck_id %r ... skipping" % (deck_id))
				continue

			current_archetype_id = row["archetype_id"]
			player_class = CardClass(row["player_class"])
			format = FormatType.FT_STANDARD if row["game_type"] == 2 else FormatType.FT_WILD

			dbf_map = {dbf_id: count for dbf_id, count in json.loads(row["deck_list"])}
			if len(archetype_ids_for_player_class[format][player_class]):
				new_archetype_id = classify_deck(
					dbf_map, self.signature_weights[format][player_class]
				)

				if new_archetype_id == current_archetype_id:
					# self.stdout.write("Deck %r - Nothing to do." % (deck_id))
					continue

				current_name = self.get_archetype_name(current_archetype_id)
				new_name = self.get_archetype_name(new_archetype_id)

				pct_complete = str(round((100.0 * counter / total_rows), 4))

				self.stdout.write("\t(%r, %s) Updating Deck ID: %r - %s => %s\n" % (
					counter, pct_complete, deck_id, current_name, new_name
				))

				self.buffer_archetype_update(deck_id, new_archetype_id)

		self.flush_db_buffer()
		self.flush_firehose_buffer()

	def buffer_archetype_update(self, deck_id, new_archetype_id):
		if new_archetype_id not in self.db_archetypes_to_update:
			self.db_archetypes_to_update[new_archetype_id] = []
		self.db_archetypes_to_update[new_archetype_id].append(deck_id)

		firehose_record = "{deck_id}|{archetype_id}|{as_of}\n".format(
			deck_id=str(deck_id),
			archetype_id=str(new_archetype_id or ""),
			as_of=self.timestamp,
		)
		self.firehose_buffer.append(firehose_record)

	def flush_db_buffer(self):
		total_db_updates = sum(len(ids) for ids in self.db_archetypes_to_update.values())
		self.stdout.write("Writing %i updates to the DB" % total_db_updates)
		for archetype_id, ids in self.db_archetypes_to_update.items():
			archetype_name = self.get_archetype_name(archetype_id)
			self.stdout.write("Updating %i decks to archetype %s" % (len(ids), archetype_name))
			Deck.objects.filter(id__in=ids).update(archetype_id=archetype_id)
		self.db_archetypes_to_update = {}

	def flush_firehose_buffer(self):
		self.stdout.write("Writing %i total items to Firehose" % len(self.firehose_buffer))
		bulk_records = self.to_data_blobs(self.firehose_buffer)
		if len(bulk_records):
			self.publish_from_iterable_at_fixed_speed(
				iter(bulk_records),
				self._publish_function,
				max_records_per_second=5000,
				publish_batch_size=500
			)
		self.firehose_buffer = []

	def to_data_blobs(self, records, max_blob_size=1000):
		result = []
		current_blob_size = 0
		current_blob_components = []

		for rec in records:
			rec_data = rec
			if current_blob_size + len(rec_data) >= max_blob_size:
				result.append({
					"Data": "".join(current_blob_components)
				})
				current_blob_size = 0
				current_blob_components = []

			current_blob_components.append(rec_data)
			current_blob_size += len(rec_data)

		if current_blob_size > 0:
			# At the end flush the remaining blob if its > 0
			result.append({
				"Data": "".join(current_blob_components)
			})

		return result

	def publish_from_iterable_at_fixed_speed(
		self,
		iterable,
		publisher_func,
		max_records_per_second,
		publish_batch_size=1
	):
		if max_records_per_second == 0:
			raise ValueError("times_per_second must be greater than 0!")

		finished = False
		while not finished:
			try:
				start_time = time.time()
				records_this_second = 0
				while not finished and records_this_second < max_records_per_second:
					batch = self.next_record_batch_of_size(iterable, publish_batch_size)
					if batch:
						records_this_second += len(batch)
						publisher_func(batch)
					else:
						finished = True

				if not finished:
					elapsed_time = time.time() - start_time
					sleep_duration = 1 - elapsed_time
					if sleep_duration > 0:
						time.sleep(sleep_duration)
			except StopIteration:
				finished = True

	def next_record_batch_of_size(self, iterable, max_batch_size):
		result = []
		count = 0
		while count < max_batch_size:
			record = next(iterable, None)
			if not record:
				break
			result.append(record)
			count += 1
		return result

	def _publish_function(self, batch):
		remainder = batch
		failure_report_records = None
		attempt_count = 0
		while len(remainder) and attempt_count <= 3:
			remainder, failure_report_records = self._attempt_publish_batch(remainder)
			if len(remainder):
				msg = "Firehose attempt %i had %i publish failures"
				self.stdout.write(msg % (attempt_count, len(remainder)))

		if len(failure_report_records):
			msg = "Firehose had %i publish failures remaining after last attempt"
			self.stdout.write(msg % len(failure_report_records))

	def _attempt_publish_batch(self, batch):
		result = FIREHOSE.put_record_batch(
			DeliveryStreamName=settings.ARCHETYPE_FIREHOSE_STREAM_NAME,
			Records=batch
		)

		failed_put_count = result["FailedPutCount"]

		failure_report_records = []
		failed_records = []
		for record, result in zip(batch, result["RequestResponses"]):
			if "ErrorCode" in result:
				failure_report_records.append(dict(
					record=record,
					stream_name=settings.ARCHETYPE_FIREHOSE_STREAM_NAME,
					error_code=result["ErrorCode"],
					error_message=result["ErrorMessage"]
				))
				failed_records.append(record)

		assert failed_put_count == len(failed_records)
		return failed_records, failure_report_records
