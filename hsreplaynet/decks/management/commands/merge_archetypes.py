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
					archetype = Archetype.objects.get(id=id)
				else:
					archetype = Archetype.objects.filter(name__iexact=id).get()
			except Archetype.DoesNotExist as e:
				raise CommandError("No such archetype (%r): %s" % (id, e))

			options[k] = archetype

		base = options["base_archetype"]
		to_merge = options["archetype_to_merge"]

		question = "Merge archetype %r into %r? [y/N] " % (to_merge, base)
		if input(question).lower() != "y":
			raise CommandError("Not merging archetypes.")

		updated = Deck.objects.filter(archetype=to_merge).update(archetype=base)
		self.stdout.write("Updated %i decks" % (updated))

		self.stdout.write("Deleting %r" % (to_merge))
		to_merge.delete()
		self.stdout.write("Done.")
