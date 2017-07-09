import datetime
from django.core.management.base import BaseCommand
from django.utils.timezone import now
from hsreplaynet.uploads.models import Descriptor


class Command(BaseCommand):
	help = "Clear expired descriptors (older than 14 days)"
	max_age = datetime.timedelta(days=14)

	def handle(self, *args, **options):
		cutoff = now() - self.max_age
		expired_descriptors = Descriptor.objects.filter(created__lt=cutoff)
		deleted, _ = expired_descriptors.delete()
		self.stdout.write("Deleted %i descriptors" % (deleted))
