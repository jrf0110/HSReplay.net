from django.core.management.base import BaseCommand
from hsreplaynet.decks.models import Archetype


class Command(BaseCommand):

	def handle(self, *args, **options):
		Archetype.objects.update_signatures()
