import json
import time
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from hearthstone.enums import CardClass, FormatType
from hsarchetypes import classify_deck
from sqlalchemy import Date, Integer, String
from sqlalchemy.sql import bindparam, text
from hsreplaynet.decks.models import Archetype, Deck
from hsreplaynet.utils.aws import redshift


REDSHIFT_QUERY = text("""
	SELECT
		p.game_type,
		p.player_class,
		p.deck_id,
		max(m.archetype_id) AS archetype_id,
		max(p.deck_list) AS deck_list
	FROM player p
	LEFT JOIN deck_archetype_map m ON m.deck_id = p.deck_id
	WHERE p.game_date BETWEEN :start_date AND :end_date
	AND p.game_type IN (2, 30)
	AND p.full_deck_known
	GROUP BY p.game_type, p.player_class, p.deck_id;
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
	def add_arguments(self, parser):
		parser.add_argument("--look_back", nargs=1)

	def handle(self, *args, **options):
		print(str(options))
		conn = redshift.get_new_redshift_connection()

		lookback_val = options["look_back"]
		if lookback_val:
			lookback = int(lookback_val[0])
		else:
			lookback = 14

		end_ts = date.today()
		start_ts = end_ts - timedelta(days=lookback)

		params = {
			"start_date": start_ts,
			"end_date": end_ts
		}
		compiled_statement = REDSHIFT_QUERY.params(params).compile(bind=conn)

		archetype_ids_for_player_class = {}
		signature_weights = {}
		archetype_map = {}

		start_timestamp = time.time()
		result_set = list(conn.execute(compiled_statement))
		print("Result Set Size: %i" % len(result_set))
		counter = 0
		for row in result_set:
			counter += 1
			if counter % 100 == 0:
				current_timestamp = time.time()
				elapsed_time = round(current_timestamp - start_timestamp)
				print("Row Number: %i (Elapsed Seconds: %i)" % (counter, elapsed_time))

			deck_id = row["deck_id"]
			dbf_map = {dbf_id: count for dbf_id, count in json.loads(row["deck_list"])}
			current_archetype_id = row["archetype_id"]
			player_class = CardClass(row["player_class"])
			format = FormatType.FT_STANDARD if row["game_type"] == 2 else FormatType.FT_WILD

			if format not in archetype_ids_for_player_class:
				archetype_ids_for_player_class[format] = {}

			if player_class not in archetype_ids_for_player_class[format]:
				configured_archetypes = []
				for a in Archetype.objects.filter(player_class=player_class):
					archetype_map[a.id] = a
					if a.is_configured_for_format(format):
						configured_archetypes.append(a.id)
				archetype_ids_for_player_class[format][player_class] = configured_archetypes

			if format not in signature_weights:
				signature_weights[format] = {}

			if player_class not in signature_weights[format]:
				archetype_ids = archetype_ids_for_player_class[format][player_class]
				signature_weights = Archetype.objects.get_signature_weights(
					archetype_ids,
					format
				)
				signature_weights[format][player_class] = signature_weights

			archetype_ids = archetype_ids_for_player_class[format][player_class]
			signature_weights = signature_weights[format][player_class]
			new_archetype_id = classify_deck(
				dbf_map, archetype_ids, signature_weights
			)

			if new_archetype_id != current_archetype_id:
				deck = Deck.objects.get(id=deck_id)
				msg = "Updating Deck ID: %i - %r\nFrom: %s To: %s"

				vals = (
					deck_id,
					deck,
					archetype_map[current_archetype_id].name if current_archetype_id else "None",
					archetype_map[new_archetype_id].name if new_archetype_id else "None"
				)
				print(msg % vals)
				deck.update_archetype(new_archetype_id)

		end_timestamp = time.time()
		duration_seconds = round(end_timestamp - start_timestamp)
		print("Took: %i Seconds" % duration_seconds)
