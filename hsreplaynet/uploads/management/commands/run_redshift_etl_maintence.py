"""
This command should be cronned every couple of minutes, e.g. every 5 minutes.

If no maintenance is needed it will do nothing.
If any maintence is needed, then it will do it.
"""
from django.core.management.base import BaseCommand
from hsreplaynet.uploads.etl import do_all_redshift_etl_maintenance


class Command(BaseCommand):
	help = "Perform any required Redshift ETL maintenance"

	def handle(self, *args, **options):
		do_all_redshift_etl_maintenance()
