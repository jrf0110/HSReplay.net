from django.apps import AppConfig


default_app_config = "hsreplaynet.billing.BillingAppConfig"


class BillingAppConfig(AppConfig):
	name = "hsreplaynet.billing"

	def ready(self):
		from . import signals  # noqa: Registering signals by importing them
