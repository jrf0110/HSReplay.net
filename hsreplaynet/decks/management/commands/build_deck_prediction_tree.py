import json
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from hearthstone.enums import CardClass, FormatType
from sqlalchemy import Date, Integer, String, TIMESTAMP
from sqlalchemy.sql import bindparam, text
from hsreplaynet.utils.aws import redshift
from hsreplaynet.utils.prediction import deck_prediction_tree


REDSHIFT_QUERY = text("""
WITH driving_table AS (
	SELECT
		b.game_id,
		b.entity_controller AS player_id,
		b.entity_dbf_id AS dbf_id,
		b.id,
		rank() OVER (PARTITION BY b.game_id, b.entity_controller ORDER BY b.id) AS play_number
	FROM player p
	JOIN block b ON b.game_id = p.game_id and b.entity_controller = p.player_id
	JOIN card c ON c.dbf_id = b.entity_dbf_id
	WHERE b.block_type = f_enum_val('BlockType.PLAY')
	AND b.entity_dbf_id IS NOT NULL
	AND p.game_type IN (2, 30)
	AND p.full_deck_known
	AND c.collectible
	AND b.game_date BETWEEN :start_date AND :end_date
	AND p.game_date BETWEEN :start_date AND :end_date
), played_cards AS (
	SELECT
		pc.game_id,
		pc.player_id,
		LISTAGG(pc.dbf_id, ',') WITHIN GROUP (ORDER BY pc.play_number) AS played_cards
	FROM driving_table pc
	WHERE pc.play_number <= 5
	GROUP BY pc.game_id, pc.player_id
)
SELECT
	g.match_start,
	p.deck_id,
	p.deck_list,
	p.player_class,
	p.game_type,
	'[' || pc.played_cards || ']' AS played_cards
FROM played_cards pc
JOIN game g ON g.id = pc.game_id
JOIN player p ON p.game_id = pc.game_id AND p.player_id = pc.player_id
WHERE g.game_date BETWEEN :start_date AND :end_date
AND p.game_date BETWEEN :start_date AND :end_date
""").bindparams(
	bindparam("start_date", type_=Date),
	bindparam("end_date", type_=Date),
).columns(
	match_start=TIMESTAMP,
	deck_id=Integer,
	deck_list=String,
	player_class=Integer,
	game_type=Integer,
	played_cards=String,
)


class Command(BaseCommand):
	def handle(self, *args, **options):
		conn = redshift.get_new_redshift_connection()
		start_ts = date.today() - timedelta(days=14)
		end_ts = date.today() - timedelta(days=1)

		params = {
			"start_date": start_ts,
			"end_date": end_ts
		}
		compiled_statement = REDSHIFT_QUERY.params(params).compile(bind=conn)
		for row in conn.execute(compiled_statement):
			as_of = row["match_start"]
			deck_id = row["deck_id"]
			dbf_map = {dbf_id: count for dbf_id, count in row["deck_list"]}
			player_class = CardClass(row["player_class"])
			format = FormatType.FT_STANDARD if row["game_type"] == 2 else FormatType.FT_WILD
			played_cards = json.loads(row["played_cards"])

			deck_prediction_tree(player_class, format).observe(
				deck_id,
				dbf_map,
				played_cards,
				as_of=as_of
			)
