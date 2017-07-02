from django.core.management.base import BaseCommand
from hsreplaynet.analytics.processing import synchronize_all_premium_users


class Command(BaseCommand):
	def handle(self, *args, **options):
		synchronize_all_premium_users()
