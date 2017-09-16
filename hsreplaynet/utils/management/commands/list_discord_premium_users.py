import json

from allauth.socialaccount.models import SocialAccount
from django.core.management.base import BaseCommand


class Command(BaseCommand):
	def handle(self, *args, **options):
		ret = []

		for acc in SocialAccount.objects.filter(provider="discord"):
			if acc.user.is_premium:
				ret.append({
					"user_id": acc.user_id,
					"discord_username": acc.extra_data.get("username", ""),
					"discord_discriminator": acc.extra_data.get("discriminator", ""),
					"discord_id": acc.extra_data.get("id", ""),
				})

		self.stdout.write(json.dumps(ret))
