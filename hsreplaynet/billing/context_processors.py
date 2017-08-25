"""
Context processors for billing/premium purposes
"""
from django.conf import settings
from djpaypal.models import BillingPlan
from djpaypal.settings import PAYPAL_LIVE_MODE, PAYPAL_CLIENT_ID
from djstripe.models import Plan
from djstripe.settings import STRIPE_LIVE_MODE, STRIPE_PUBLIC_KEY
from .views import STRIPE_DEBUG


def premium(request):
	is_premium = request.user.is_authenticated and request.user.is_premium
	plans = Plan.objects.filter(livemode=STRIPE_LIVE_MODE)
	paypal_plans = BillingPlan.objects.filter(livemode=PAYPAL_LIVE_MODE)

	if is_premium and request.COOKIES.get("free-mode") == "true":
		is_premium = False

	return {
		"premium": is_premium,
		"show_premium_modal": not is_premium and "premium-modal" in request.GET,
		"monthly_plan": plans.filter(stripe_id=settings.MONTHLY_PLAN_ID).first(),
		"semiannual_plan": plans.filter(stripe_id=settings.SEMIANNUAL_PLAN_ID).first(),
		"paypal_monthly_plan": paypal_plans.filter(id=settings.PAYPAL_MONTHLY_PLAN_ID).first(),
		"stripe_debug": STRIPE_DEBUG,
		"STRIPE_PUBLIC_KEY": STRIPE_PUBLIC_KEY,
		"PAYPAL_CLIENT_ID": PAYPAL_CLIENT_ID,
	}
