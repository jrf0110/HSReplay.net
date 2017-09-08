from django.db.models.signals import post_save
from django.dispatch import receiver
from djpaypal.models.webhooks import (
	webhook_handler as djpaypal_webhook_handler, WebhookEventTrigger
)
from djstripe.webhooks import handler as djstripe_webhook_handler
from hsreplaynet.analytics.processing import enable_premium_accounts_for_users_in_redshift
from hsreplaynet.utils.instrumentation import error_handler


@djstripe_webhook_handler("customer.subscription.created")
def sync_premium_accounts_for_stripe_subscription(event, **kwargs):
	if event.customer and event.customer.subscriber:
		user = event.customer.subscriber
		enable_premium_accounts_for_users_in_redshift([user])


@djpaypal_webhook_handler("billing.subscription.*")
def sync_premium_accounts_for_paypal_subscription(sender, event, **kwargs):
	subscription = event.get_resource()
	if subscription.user and subscription.user.is_premium:
		enable_premium_accounts_for_users_in_redshift([subscription.user])


@receiver(post_save, sender=WebhookEventTrigger)
def on_paypal_webhook_error(sender, instance, **kwargs):
	if instance.exception:
		try:
			raise Exception("%s - %s" % (instance.exception, instance.id))
		except Exception:
			error_handler()
