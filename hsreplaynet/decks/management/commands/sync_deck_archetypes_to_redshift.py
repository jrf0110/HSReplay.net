from django.core.management.base import BaseCommand
from hearthstone.enums import FormatType
from sqlalchemy import Integer
from sqlalchemy.sql import text
from hsreplaynet.decks.models import Archetype, Deck
from hsreplaynet.utils.aws import redshift


REDSHIFT_QUERY = text("""
	SELECT
		m.deck_id,
		m.archetype_id
	FROM deck_archetype_map m;
""").columns(
	deck_id=Integer,
	archetype_id=Integer
)


class Command(BaseCommand):
	def handle(self, *args, **options):

		conn = redshift.get_new_redshift_connection()
		compiled_statement = REDSHIFT_QUERY.compile(bind=conn)
		deck_archetype_map = {}
		for r in conn.execute(compiled_statement):
			deck_archetype_map[r["deck_id"]] = r["archetype_id"]

		for game_format in (FormatType.FT_STANDARD, FormatType.FT_WILD):
			print("\n\nStarting: %s" % game_format.name)

			global_decks = Archetype.objects._get_deck_observation_counts_from_redshift(
				game_format
			)
			digests = list(global_decks.keys())

			qs = list(Deck.objects.filter(digest__in=digests))
			total_decks = len(qs)
			print("About to Sync %i Decks" % total_decks)
			counter = 0
			for deck in qs:
				counter += 1
				if deck.archetype_id != deck_archetype_map[deck.id]:
					deck.sync_archetype_to_firehose()
				if counter % 1000 == 0:
					print("Counter: %i" % counter)
