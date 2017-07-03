"""Lambdas written to be executed as a cron operation.

The cron schedule for these must be setup via the AWS Web Console.
"""
from django.conf import settings
from django.db import connections
from django.utils.timezone import now
from hsreplaynet.uploads.models import RedshiftStagingTrack
from hsreplaynet.utils.influx import influx_metric
from hsreplaynet.utils.instrumentation import lambda_handler


@lambda_handler(
	cpu_seconds=300,
	requires_vpc_access=True,
	tracing=False
)
def do_redshift_etl_maintenance(event, context):
	"""A periodic job to orchestrate Redshift ETL Maintenance"""
	RedshiftStagingTrack.objects.do_maintenance()


@lambda_handler(cpu_seconds=300, tracing=False)
def reap_upload_events(event, context):
	"""A periodic job to cleanup old upload events."""
	current_timestamp = now()
	reap_upload_events_asof(
		current_timestamp.year,
		current_timestamp.month,
		current_timestamp.day,
		current_timestamp.hour
	)


def reap_upload_events_asof(year, month, day, hour):
	success_reaping_delay = settings.SUCCESSFUL_UPLOAD_EVENT_REAPING_DELAY_DAYS
	nonsuccess_reaping_delay = settings.UNSUCCESSFUL_UPLOAD_EVENT_REAPING_DELAY_DAYS

	cursor = connections["uploads"].cursor()
	args = (year, month, day, hour, success_reaping_delay, nonsuccess_reaping_delay,)
	# Note: this stored proc will only delete the DB records
	# The objects in S3 will age out naturally after 90 days
	# according to our bucket's object lifecycle policy
	cursor.callproc("reap_upload_events", args)
	result_row = cursor.fetchone()
	successful_reaped = result_row[0]
	unsuccessful_reaped = result_row[1]
	influx_metric("upload_events_reaped", fields={
		"successful_reaped": successful_reaped,
		"unsuccessful_reaped": unsuccessful_reaped
	})
	cursor.close()
