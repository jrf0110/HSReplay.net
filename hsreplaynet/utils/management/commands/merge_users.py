from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from hsreplaynet.accounts.utils import merge_users


class Command(BaseCommand):
	def add_arguments(self, parser):
		parser.add_argument("base_user", nargs=1)
		parser.add_argument("user", nargs=1)

	def handle(self, *args, **options):
		base_username = options["base_user"]
		username = options["user"]
		User = get_user_model()

		try:
			base_user = User.objects.get(username=base_username[0])
			user = User.objects.get(username=username[0])
		except User.DoesNotExist as e:
			raise CommandError(e)

		if input("Merge user %r into %r? [y/N] " % (user, base_user)).lower() != "y":
			raise CommandError("Not merging users.")
			return

		merge_users(base_user, user)

		self.stdout.write("Users have been merged.")
