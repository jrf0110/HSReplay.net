from django.core.management.base import BaseCommand

from hsreplaynet.decks.models import ClusterSetSnapshot


class Command(BaseCommand):
	def handle(self, *args, **options):
		cluster_set = ClusterSetSnapshot.objects.filter(latest=True).first()
		if cluster_set:
			cluster_set.update_archetype_signatures()
