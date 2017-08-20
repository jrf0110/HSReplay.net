import json
from datetime import date, datetime, timedelta
from django.conf import settings
from django.core.management.base import BaseCommand
from hearthstone.enums import CardClass, FormatType
from hsarchetypes import classify_deck
from sqlalchemy import Date, Integer, String
from sqlalchemy.sql import bindparam, text
from hsreplaynet.decks.models import Archetype, ArchetypeTrainingDeck, Deck
from hsreplaynet.utils.aws import redshift
from hsreplaynet.utils.aws.clients import FIREHOSE


REDSHIFT_QUERY = text("""
	SELECT
		p.game_type,
		p.player_class,
		p.proxy_deck_id AS deck_id,
		max(m.archetype_id) AS archetype_id,
		max(p.deck_list) AS deck_list
	FROM player p
	LEFT JOIN deck_archetype_map m ON m.deck_id = p.proxy_deck_id
	WHERE p.game_date BETWEEN :start_date AND :end_date
	AND p.game_type IN (2, 30)
	AND p.full_deck_known
	GROUP BY p.game_type, p.player_class, p.proxy_deck_id;
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
		parser.add_argument("--lookback", nargs="?", type=int, default=14)

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

		archetype_ids_for_player_class = {}
		training_decks = [d.id for d in ArchetypeTrainingDeck.objects.all()]

		result_set = list(conn.execute(compiled_statement))
		total_rows = len(result_set)
		self.stdout.write("%i decks to update" % (total_rows))

		for counter, row in enumerate(result_set):
			deck_id = row["deck_id"]
			if deck_id is None:
				self.stderr.write("Got deck_id %r ... skipping" % (deck_id))
				continue

			if deck_id in training_decks:
				self.stdout.write("deck_id %r in training decks, skipping" % (deck_id))
				continue

			current_archetype_id = row["archetype_id"]
			player_class = CardClass(row["player_class"])
			format = FormatType.FT_STANDARD if row["game_type"] == 2 else FormatType.FT_WILD

			if format not in archetype_ids_for_player_class:
				archetype_ids_for_player_class[format] = {}

			if player_class not in archetype_ids_for_player_class[format]:
				configured_archetypes = []
				for a in Archetype.objects.filter(player_class=player_class):
					latest_sig = a.signature_set.filter(format=format).latest()
					if latest_sig.components.count() > 0:
						self.archetype_map[a.id] = a
						if format == FormatType.FT_WILD and a.active_in_wild:
							configured_archetypes.append(a.id)
						elif format == FormatType.FT_STANDARD and a.active_in_standard:
							configured_archetypes.append(a.id)
				archetype_ids_for_player_class[format][player_class] = configured_archetypes

			if player_class not in self.signature_weights[format]:
				archetype_ids = archetype_ids_for_player_class[format][player_class]
				signature_weight_values = Archetype.objects.get_signature_weights(
					archetype_ids,
					format
				)
				self.signature_weights[format][player_class] = signature_weight_values

			dbf_map = {dbf_id: count for dbf_id, count in json.loads(row["deck_list"])}
			archetype_ids = archetype_ids_for_player_class[format][player_class]
			new_archetype_id = classify_deck(
				dbf_map, archetype_ids, self.signature_weights[format][player_class]
			)

			if new_archetype_id == current_archetype_id:
				# self.stdout.write("Deck %r - Nothing to do." % (deck_id))
				continue

			current_name = self.get_archetype_name(current_archetype_id)
			new_name = self.get_archetype_name(new_archetype_id)

			pct_complete = str(round((100.0 * counter / total_rows), 4))

			self.stdout.write("(%r, %s) Updating Deck ID: %r - %s => %s\n" % (
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
		self.firehose_buffer.append({
			"Data": firehose_record.encode("utf-8"),
		})

	def flush_db_buffer(self):
		for archetype_id, ids in self.db_archetypes_to_update.items():
			self.stdout.write("Updating %i decks to archetype %r" % (len(ids), archetype_id))
			Deck.objects.filter(id__in=ids).update(archetype_id=archetype_id)

	def flush_firehose_buffer(self):
		while self.firehose_buffer:
			items = self.firehose_buffer[:self.firehose_batch_size]
			del self.firehose_buffer[:self.firehose_batch_size]
			self.stdout.write("Writing %i items to Firehose" % (len(items)))

			result = FIREHOSE.put_record_batch(
				DeliveryStreamName=settings.ARCHETYPE_FIREHOSE_STREAM_NAME,
				Records=items
			)

			# re-append failed records to the buffer
			for record, result in zip(items, result["RequestResponses"]):
				if "ErrorCode" in result:
					self.firehose_buffer.append(record)
