from django.core.management.base import BaseCommand
from hsreplaynet.decks.models import Archetype


class Command(BaseCommand):
	def handle(self, *args, **options):
		for archetype in Archetype.objects.all():
			Archetype.objects.update_signatures()
