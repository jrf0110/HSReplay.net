from djstripe.webhooks import handler as djstripe_webhook_handler
from hsreplaynet.analytics.processing import enable_premium_accounts_for_users_in_redshift


@djstripe_webhook_handler("customer.subscription.created")
def sync_premium_accounts_for_subscription(event):
	if event.customer and event.customer.subscriber:
		user = event.customer.subscriber
		enable_premium_accounts_for_users_in_redshift([user])
