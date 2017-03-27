"""
Context processors for billing/premium purposes
"""
from django.conf import settings
from djstripe.models import Plan
from djstripe.settings import STRIPE_LIVE_MODE


STRIPE_DEBUG = not STRIPE_LIVE_MODE and settings.DEBUG


def premium(request):
	is_premium = request.user.is_authenticated and request.user.is_premium
	plans = Plan.objects.filter(livemode=STRIPE_LIVE_MODE)

	if is_premium and request.COOKIES.get("free-mode") == "true":
		is_premium = False

	return {
		"premium": is_premium,
		"show_premium_modal": not is_premium and "premium-modal" in request.GET,
		"monthly_plan": plans.filter(stripe_id=settings.MONTHLY_PLAN_ID).first(),
		"semiannual_plan": plans.filter(stripe_id=settings.SEMIANNUAL_PLAN_ID).first(),
		"stripe_debug": STRIPE_DEBUG,
	}
