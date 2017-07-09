from django.core.management.base import BaseCommand
from django.db import connections
from django.utils.timezone import now
from hsreplaynet.utils.influx import influx_metric


class Command(BaseCommand):
	help = "Clear old upload events"
	successful_cutoff_days = 5
	unsuccessful_cutoff_days = 60
	database = "uploads"

	def handle(self, *args, **options):
		cursor = connections[self.database].cursor()
		ts = now()
		args = (
			ts.year, ts.month, ts.day, ts.hour,
			self.successful_cutoff_days, self.unsuccessful_cutoff_days
		)

		cursor.callproc("reap_upload_events", args)
		result_row = cursor.fetchone()
		successful_reaped = result_row[0]
		unsuccessful_reaped = result_row[1]
		cursor.close()

		influx_metric("upload_events_reaped", fields={
			"successful_reaped": successful_reaped,
			"unsuccessful_reaped": unsuccessful_reaped
		})

		self.stdout.write("Deleted %i successful upload events" % (successful_reaped))
		self.stdout.write("Deleted %i unsuccessful upload events" % (unsuccessful_reaped))
