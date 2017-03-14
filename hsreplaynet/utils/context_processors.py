"""
Context processors for billing/premium purposes
"""
import json
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder


def userdata(request):
	is_authenticated = bool(request.user.is_authenticated)  # Django 1.10 hack
	data = {
		"is_authenticated": is_authenticated,
		"card_art_url": settings.HEARTHSTONE_ART_URL,
	}
	if is_authenticated:
		data["username"] = request.user.username
		data["battletag"] = request.user.battletag
		data["premium"] = request.user.is_premium

	return {"userdata": json.dumps(data, cls=DjangoJSONEncoder)}
