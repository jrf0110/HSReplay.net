"""
Context processors for billing/premium purposes
"""


def premium(request):
	is_premium = request.user.is_authenticated and request.user.is_premium
	return {
		"premium": is_premium,
		"show_premium_modal": not is_premium and "premium-modal" in request.GET,
	}
