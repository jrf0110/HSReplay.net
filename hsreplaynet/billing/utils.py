from hsreplaynet.analytics.processing import PremiumUserCacheWarmingContext


def get_premium_cache_warming_contexts_from_subscriptions():
	result = []
	from djstripe.models import Subscription
	for subscription in Subscription.objects.active():
		user = subscription.customer.subscriber
		if user:
			context = PremiumUserCacheWarmingContext.from_user(user)
			result.append(context)
	return result


def get_all_premium_accounts():
	result = []
	from djstripe.models import Subscription
	for subscription in Subscription.objects.all():
		user = subscription.customer.subscriber
		blizzard_accounts = list(user.blizzard_accounts.all())
		for account in blizzard_accounts:
			result.append(dict(
				user_id=user.id,
				region=account.account_hi,
				account_lo=account.account_lo,
				active=subscription.active
			))
	return result
