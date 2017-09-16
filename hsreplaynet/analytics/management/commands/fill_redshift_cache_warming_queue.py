from django.conf import settings
from django.core.management.base import BaseCommand

from hsreplaynet.analytics.processing import fill_redshift_cache_warming_queue
from hsreplaynet.utils.aws.sqs import block_until_empty
from hsreplaynet.utils.synchronization import advisory_lock


class Command(BaseCommand):

	def add_arguments(self, parser):
		parser.add_argument(
			"-q",
			"--queries",
			nargs="*",
			help="The list of queries to cache warm"
		)

	def handle(self, *args, **options):
		# Claim the maintenance lock to prevent ETL operations during cache warming.
		LOCK_NAME = "REDSHIFT_ETL_MAINTENANCE_LOCK"
		NAMESPACE, ADVISORY_LOCK_ID = settings.ADVISORY_LOCK_NAMESPACES[LOCK_NAME]

		with advisory_lock([NAMESPACE, ADVISORY_LOCK_ID]):
			fill_redshift_cache_warming_queue(options["queries"])
			# Poll until queue is empty
			block_until_empty(settings.REDSHIFT_ANALYTICS_QUERY_QUEUE_NAME)
			# Exiting the context manager will allow maintenance to resume
