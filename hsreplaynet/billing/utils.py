from django.dispatch import receiver
from djstripe import signals
from hsreplaynet.analytics.processing import warm_redshift_cache_for_user


@receiver(signals.WEBHOOK_SIGNALS["customer.subscription.created"])
def on_premium_purchased(sender, event, **kwargs):
	if event.customer and event.customer.subscriber:
		warm_redshift_cache_for_user(event.customer.subscriber)


def get_premium_pegasus_accounts():
	result = []
	from djstripe.models import Subscription
	for subscription in Subscription.objects.active():
		user = subscription.customer.subscriber
		if user:
			result.extend(list(user.pegasusaccount_set.all()))
	return result
