"""
Context processors for billing/premium purposes
"""


def premium(request):
	return {
		"premium": request.user.is_authenticated and request.user.is_premium,
	}
