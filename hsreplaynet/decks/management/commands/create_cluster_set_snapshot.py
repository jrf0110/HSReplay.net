from django.core.management.base import BaseCommand
from hearthstone.enums import FormatType
from hsreplaynet.decks.models import ClusterSetSnapshot


class Command(BaseCommand):
	def add_arguments(self, parser):
		parser.add_argument("--num-clusters", default=20, type=int)
		parser.add_argument("--merge-threshold", default=0.85, type=float)

	def handle(self, *args, **options):
		num_clusters = options["num_clusters"]
		merge_threshold = options["merge_threshold"]
		msg = "%i clusters, %s merge threshold"

		self.stdout.write(msg % (num_clusters, merge_threshold))

		ClusterSetSnapshot.objects.snapshot(
			FormatType.FT_STANDARD,
			num_clusters=num_clusters,
			merge_threshold=merge_threshold
		)
