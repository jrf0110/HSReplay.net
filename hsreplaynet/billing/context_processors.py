"""
Context processors for billing/premium purposes
"""
from django.conf import settings
from djstripe.models import Plan


def premium(request):
	is_premium = request.user.is_authenticated and request.user.is_premium
	return {
		"premium": is_premium,
		"show_premium_modal": not is_premium and "premium-modal" in request.GET,
		"monthly_plan": Plan.objects.filter(stripe_id=settings.MONTHLY_PLAN_ID).first(),
		"semiannual_plan": Plan.objects.filter(stripe_id=settings.SEMIANNUAL_PLAN_ID).first(),
	}
