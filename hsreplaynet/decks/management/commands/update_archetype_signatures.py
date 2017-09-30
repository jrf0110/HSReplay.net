from django.core.management.base import BaseCommand

from hsreplaynet.decks.models import ClusterSetSnapshot


class Command(BaseCommand):
	def add_arguments(self, parser):
		parser.add_argument("--force", default=0, type=int)

	def handle(self, *args, **options):
		force = bool(options["force"])
		cluster_set = ClusterSetSnapshot.objects.filter(latest=True).first()
		if cluster_set:
			cluster_set.update_archetype_signatures(force=force)
