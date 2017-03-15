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
		data["accounts"] = []
		for acc in request.user.pegasusaccount_set.all():
			data["accounts"].append({
				"lo": acc.account_lo,
				"battletag": acc.battletag,
				"region": acc.region,
				"display": str(acc),
			})

		data["groups"] = []
		for group in request.user.groups.all():
			data["groups"].append(group.name.replace(":preview", ""))

	return {"userdata": json.dumps(data, cls=DjangoJSONEncoder)}
