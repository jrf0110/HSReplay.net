from django.db import models
from django.dispatch.dispatcher import receiver
from djstripe.models import Subscription
from hsreplaynet.analytics.processing import (
	PremiumUserCacheWarmingContext, synchronize_redshift_premium_accounts_for_user
)


def get_premium_cache_warming_contexts_from_subscriptions():
	result = []
	for subscription in Subscription.objects.active():
		user = subscription.customer.subscriber
		if user:
			context = PremiumUserCacheWarmingContext.from_user(user)
			result.append(context)
	return result


@receiver(models.signals.post_save, sender=Subscription)
def sync_subscription_to_redshift(sender, instance, **kwargs):
	if instance.customer.subscriber:
		user = instance.customer.subscriber
		synchronize_redshift_premium_accounts_for_user(user)
