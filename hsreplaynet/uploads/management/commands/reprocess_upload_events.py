from dateutil import parse as parse_timestamp
from django.core.management.base import BaseCommand

from hsreplaynet.games.processing import do_process_upload_event
from hsreplaynet.uploads.models import UploadEvent


class Command(BaseCommand):
	def add_arguments(self, parser):
		parser.add_argument(
			"--from", required=True,
			help="Initial date (YYYY-MM-DD HH:MM:SSZ)",
		)
		parser.add_argument(
			"--to", required=True,
			help="End date (YYYY-MM-DD HH:MM:SSZ)",
		)
		parser.add_argument(
			"--shortid", nargs="*",
			help="Limit reprocessing to specific shortids"
		)

	def handle(self, *args, **options):
		from_date = parse_timestamp(options["from"])
		to_date = parse_timestamp(options["to"])
		uploads = UploadEvent.objects.filter(
			created__gte=from_date,
			created__lte=to_date
		)

		shortid = options.get("shortid")
		if shortid:
			uploads = uploads.filter(shortid__in=shortid)

		for upload in uploads:
			print("Reprocessing %r" % (upload))
			do_process_upload_event(upload)
