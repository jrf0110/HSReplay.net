from django.core.management.base import BaseCommand
from hsreplaynet.analytics.processing import fill_redshift_cache_warming_queue


class Command(BaseCommand):
	def handle(self, *args, **options):
		fill_redshift_cache_warming_queue()
