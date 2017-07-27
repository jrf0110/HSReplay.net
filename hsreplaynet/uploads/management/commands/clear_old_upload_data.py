from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils.timezone import now
from hsreplaynet.uploads.models import Descriptor, UploadEvent


class Command(BaseCommand):
	help = "Clear old upload events and descriptors"

	def handle(self, *args, **options):
		cutoff = now() - timedelta(days=15)

		self.stdout.write("Deleting descriptors")
		deleted_descriptors = Descriptor.objects.filter(created__lt=cutoff).delete()
		self.stdout.write("Deleted %i descriptors" % (deleted_descriptors[0]))

		self.stdout.write("Deleting upload events")
		# Using _raw_delete() so that signals and checks aren't performed.
		# The deleted UploadEvent set can be pretty big, using a simple .delete() may OOM.
		qs = UploadEvent.objects.filter(created__lt=cutoff)
		deleted_uploadevents = qs._raw_delete(using=qs.db)
		self.stdout.write("Deleted %i successful upload events" % (deleted_uploadevents))
