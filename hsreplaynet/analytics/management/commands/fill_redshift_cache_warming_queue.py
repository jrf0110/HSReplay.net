from django.core.management.base import BaseCommand
from hsreplaynet.analytics.processing import fill_redshift_cache_warming_queue


class Command(BaseCommand):

	def add_arguments(self, parser):
		parser.add_argument(
			"-q",
			"--queries",
			nargs="*",
			help="The list of queries to cache warm"
		)

	def handle(self, *args, **options):
		fill_redshift_cache_warming_queue(options["queries"])
