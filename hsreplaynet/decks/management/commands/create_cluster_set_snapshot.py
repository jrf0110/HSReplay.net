from django.core.management.base import BaseCommand
from hearthstone.enums import FormatType
from hsreplaynet.decks.models import ClusterSetSnapshot


class Command(BaseCommand):
	def handle(self, *args, **options):
		ClusterSetSnapshot.objects.snapshot(FormatType.FT_STANDARD)
