from djpaypal.models import WebhookEvent
from djstripe.models import Event, Subscription

from hsreplaynet.analytics.processing import PremiumUserCacheWarmingContext


def get_premium_cache_warming_contexts_from_subscriptions():
	result = []
	for subscription in Subscription.objects.active():
		user = subscription.customer.subscriber
		if user:
			context = PremiumUserCacheWarmingContext.from_user(user)
			result.append(context)
	return result


def user_stripe_subscribe_events(user):
	if not user.is_authenticated:
		return []

	customer_id = user.stripe_customer.stripe_id

	return Event.objects.filter(
		type="customer.subscription.created",
		data__object__customer=customer_id
	)


def user_paypal_subscribe_events(user):
	if not user.is_authenticated:
		return []

	# https://code.djangoproject.com/ticket/28872
	ret = []
	for payer_id in list(user.paypal_payers.values_list("id", flat=True)):
		ret += WebhookEvent.objects.filter(
			event_type="BILLING.SUBSCRIPTION.CREATED",
			resource__payer__payer_info__payer_id=payer_id
		)

	return ret


def user_subscription_events_count(user) -> int:
	stripe_events = user_stripe_subscribe_events(user)
	paypal_events = user_paypal_subscribe_events(user)

	return len(stripe_events) + len(paypal_events)
