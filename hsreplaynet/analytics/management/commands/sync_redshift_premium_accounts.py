from django.core.management.base import BaseCommand
from hsreplaynet.analytics.processing import enable_all_premium_users_in_redshift


class Command(BaseCommand):
	def handle(self, *args, **options):
		enable_all_premium_users_in_redshift()
