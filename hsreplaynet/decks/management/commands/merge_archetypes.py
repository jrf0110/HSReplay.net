from django.core.management.base import BaseCommand, CommandError

from hsreplaynet.decks.models import Archetype, Deck


class Command(BaseCommand):
	def add_arguments(self, parser):
		parser.add_argument("base_archetype", nargs=1)
		parser.add_argument("archetype_to_merge", nargs=1)

	def handle(self, *args, **options):
		for k in ("base_archetype", "archetype_to_merge"):
			id = options[k][0]
			try:
				if id.isdigit():
					archetype = Archetype.objects.live().get(id=id)
				else:
					archetype = Archetype.objects.live().filter(
						name__iexact=id
					).get()
			except Archetype.DoesNotExist as e:
				raise CommandError("No such archetype (%r): %s" % (id, e))

			options[k] = archetype

		base = options["base_archetype"]
		to_merge = options["archetype_to_merge"]

		question = "Merge archetype %r into %r? [y/N] " % (to_merge, base)
		if input(question).lower() != "y":
			raise CommandError("Not merging archetypes.")

		deck_ids = Deck.objects.filter(archetype=to_merge).values_list("id", flat=True)
		self.stdout.write("Found %i decks to update" % (len(deck_ids)))

		updated = Deck.objects.filter(archetype=to_merge).update(archetype=base)
		self.stdout.write("Updated archetype on %i decks" % (updated))

		for id in deck_ids:
			deck = Deck.objects.get(id=id)
			self.stdout.write("Syncing deck %r to firehose" % (id))
			deck.sync_archetype_to_firehose()

		self.stdout.write("Deleting %r" % (to_merge))
		to_merge.delete()
		self.stdout.write("Done.")
