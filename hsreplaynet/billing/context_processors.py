"""
Context processors for billing/premium purposes
"""
from django.conf import settings
from djstripe.models import Plan


# `STRIPE_DEBUG` is set if DEBUG is on *and* we are using a test mode pubkey
STRIPE_LIVE_MODE = settings.STRIPE_PUBLIC_KEY.startswith("pk_live_")
STRIPE_DEBUG = not STRIPE_LIVE_MODE and settings.DEBUG


def premium(request):
	is_premium = request.user.is_authenticated and request.user.is_premium
	plans = Plan.objects.filter(livemode=STRIPE_LIVE_MODE)
	return {
		"premium": is_premium,
		"show_premium_modal": not is_premium and "premium-modal" in request.GET,
		"monthly_plan": plans.filter(stripe_id=settings.MONTHLY_PLAN_ID).first(),
		"semiannual_plan": plans.filter(stripe_id=settings.SEMIANNUAL_PLAN_ID).first(),
		"stripe_debug": STRIPE_DEBUG,
	}
