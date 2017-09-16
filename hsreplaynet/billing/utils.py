from djstripe.models import Subscription

from hsreplaynet.analytics.processing import PremiumUserCacheWarmingContext


def get_premium_cache_warming_contexts_from_subscriptions():
	result = []
	for subscription in Subscription.objects.active():
		user = subscription.customer.subscriber
		if user:
			context = PremiumUserCacheWarmingContext.from_user(user)
			result.append(context)
	return result
