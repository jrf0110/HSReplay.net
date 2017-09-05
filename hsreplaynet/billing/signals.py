from djpaypal.models.webhooks import webhook_handler as djpaypal_webhook_handler
from djstripe.webhooks import handler as djstripe_webhook_handler
from hsreplaynet.analytics.processing import enable_premium_accounts_for_users_in_redshift


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
