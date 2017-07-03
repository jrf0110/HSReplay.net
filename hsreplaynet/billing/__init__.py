from djstripe import webhooks
from hsreplaynet.utils import log
from hsreplaynet.utils.influx import influx_metric


@webhooks.handler("customer.subscription.created")
def customer_subscription_created_handler(event, event_data, event_type, event_subtype):
	from hsreplaynet.analytics.processing import (
		PremiumUserCacheWarmingContext, warm_redshift_cache_for_user_context
	)
	if event.customer and event.customer.subscriber:
		user = event.customer.subscriber
		log.info("Received premium purchased signal for user: %s" % user.username)
		log.info("Scheduling personalized stats for immediate cache warming.")
		context = PremiumUserCacheWarmingContext.from_user(user)

		fields = {
			"count": 1,
			"user": user.username
		}

		influx_metric(
			"premium_purchase_cache_warm_event",
			fields,
		)

		warm_redshift_cache_for_user_context(context)


@webhooks.handler("customer.subscription.created")
def sync_premium_accounts_for_subscription(event, event_data, event_type, event_subtype):
	from hsreplaynet.analytics.processing import (
		synchronize_redshift_premium_accounts_for_user
	)
	if event.customer and event.customer.subscriber:
		user = event.customer.subscriber
		synchronize_redshift_premium_accounts_for_user(user)
