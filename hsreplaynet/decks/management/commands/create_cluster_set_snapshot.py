from django.core.management.base import BaseCommand
from hearthstone.enums import FormatType
from hsreplaynet.decks.models import ClusterSetSnapshot


class Command(BaseCommand):
	def add_arguments(self, parser):
		parser.add_argument("--num-clusters", default=50, type=int)
		parser.add_argument("--merge-threshold", default=0.75, type=float)
		parser.add_argument("--lookback", default=7, type=int)
		parser.add_argument("--min-observations", default=100, type=int)

	def handle(self, *args, **options):
		num_clusters = options["num_clusters"]
		merge_threshold = options["merge_threshold"]
		lookback = options["lookback"]
		min_observations = options["min_observations"]
		msg = "%i clusters, %s merge_threshold, %i lookback, %i min_observations"

		vals = (num_clusters, merge_threshold, lookback, min_observations)
		self.stdout.write(msg % vals)

		ClusterSetSnapshot.objects.snapshot(
			FormatType.FT_STANDARD,
			num_clusters=num_clusters,
			merge_threshold=merge_threshold,
			lookback=lookback,
			min_observations=min_observations
		)
