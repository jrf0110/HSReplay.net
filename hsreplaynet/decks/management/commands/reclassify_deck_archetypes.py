import json
import time
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from hearthstone.enums import CardClass, FormatType
from hsarchetypes import classify_deck
from sqlalchemy import Date, Integer, String
from sqlalchemy.sql import bindparam, text
from hsreplaynet.decks.models import Archetype, ArchetypeTrainingDeck, Deck
from hsreplaynet.utils.aws import redshift


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
		training_decks = {}

		start_timestamp = time.time()
		result_set = list(conn.execute(compiled_statement))
		total_rows = len(result_set)
		print("Result Set Size: %i" % total_rows)
		counter = 0
		for row in result_set:
			counter += 1
			pct_complete = str(round((100.0 * counter / total_rows), 4))

			deck_id = row["deck_id"]
			dbf_map = {dbf_id: count for dbf_id, count in json.loads(row["deck_list"])}
			current_archetype_id = row["archetype_id"]
			player_class = CardClass(row["player_class"])
			format = FormatType.FT_STANDARD if row["game_type"] == 2 else FormatType.FT_WILD

			if format not in training_decks:
				training_decks[format] = {}

			if player_class not in training_decks[format]:
				training_decks[format][player_class] = []
				training_decks[format][player_class].extend(
					ArchetypeTrainingDeck.objects.get_training_decks(format, player_class)
				)
				training_decks[format][player_class].extend(
					ArchetypeTrainingDeck.objects.get_validation_decks(format, player_class)
				)

			if deck_id in training_decks[format][player_class]:
				continue

			if format not in archetype_ids_for_player_class:
				archetype_ids_for_player_class[format] = {}

			if player_class not in archetype_ids_for_player_class[format]:
				configured_archetypes = []
				for a in Archetype.objects.filter(player_class=player_class):
					archetype_map[a.id] = a
					if format == FormatType.FT_WILD and a.active_in_wild:
						configured_archetypes.append(a.id)
					elif format == FormatType.FT_STANDARD and a.active_in_standard:
						configured_archetypes.append(a.id)
				archetype_ids_for_player_class[format][player_class] = configured_archetypes

			if format not in signature_weights:
				signature_weights[format] = {}

			if player_class not in signature_weights[format]:
				archetype_ids = archetype_ids_for_player_class[format][player_class]
				signature_weight_values = Archetype.objects.get_signature_weights(
					archetype_ids,
					format
				)
				signature_weights[format][player_class] = signature_weight_values

			archetype_ids = archetype_ids_for_player_class[format][player_class]
			signature_weights = signature_weights[format][player_class]
			new_archetype_id = classify_deck(
				dbf_map, archetype_ids, signature_weights
			)

			if new_archetype_id != current_archetype_id:
				try:
					deck = Deck.objects.get(id=deck_id)
				except Deck.DoesNotExist:
					continue

				if deck and deck.archetype_id != new_archetype_id:
					msg = "\n(%i, %s) Updating Deck ID: %i - %r\nFrom: %s To: %s"

					if current_archetype_id and current_archetype_id in archetype_map:
						current_name = archetype_map[current_archetype_id].name
					else:
						current_name = "None"

					if new_archetype_id and new_archetype_id in archetype_map:
						new_name = archetype_map[new_archetype_id].name
					else:
						new_name = "None"

					vals = (
						counter,
						pct_complete,
						deck_id,
						deck,
						current_name,
						new_name
					)
					print(msg % vals)
					deck.update_archetype(new_archetype_id)

		end_timestamp = time.time()
		duration_seconds = round(end_timestamp - start_timestamp)
		print("Took: %i Seconds" % duration_seconds)
