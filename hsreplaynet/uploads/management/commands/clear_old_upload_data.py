from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils.timezone import now
from hsreplaynet.uploads.models import Descriptor, UploadEvent


class Command(BaseCommand):
	help = "Clear old upload events and descriptors"

	def handle(self, *args, **options):
		cutoff = now() - timedelta(days=15)

		deleted_uploadevents = UploadEvent.objects.filter(created__lt=cutoff).delete()
		self.stdout.write("Deleted %i successful upload events" % (deleted_uploadevents[0]))

		deleted_descriptors = Descriptor.objects.filter(created__lt=cutoff).delete()
		self.stdout.write("Deleted %i descriptors" % (deleted_descriptors[0]))
