from django.db.models.signals import post_save
from django.dispatch import receiver
from djpaypal.models import webhooks as djpaypal_webhooks
from djstripe import webhooks as djstripe_webhooks

from hsreplaynet.analytics.processing import enable_premium_accounts_for_users_in_redshift
from hsreplaynet.utils.instrumentation import error_handler


@djstripe_webhooks.handler("customer.subscription.created")
def sync_premium_accounts_for_stripe_subscription(event, **kwargs):
	if event.customer and event.customer.subscriber:
		user = event.customer.subscriber
		enable_premium_accounts_for_users_in_redshift([user])

		if event.customer.active_subscriptions.count() > 1:
			try:
				raise RuntimeError(
					"Customer %r (%r) has multiple subscriptions!" % (user, event.customer.stripe_id)
				)
			except Exception as e:
				error_handler(e)


@djpaypal_webhooks.webhook_handler("billing.subscription.*")
def sync_premium_accounts_for_paypal_subscription(sender, event, **kwargs):
	subscription = event.get_resource()
	if subscription.user and subscription.user.is_premium:
		enable_premium_accounts_for_users_in_redshift([subscription.user])


@receiver(post_save, sender=djpaypal_webhooks.WebhookEventTrigger)
def on_paypal_webhook_error(sender, instance, **kwargs):
	if instance.exception:
		try:
			raise Exception("%s - %s" % (instance.exception, instance.id))
		except Exception as e:
			error_handler(e)
