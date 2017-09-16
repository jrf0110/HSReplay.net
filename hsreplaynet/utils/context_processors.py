"""
Context processors for billing/premium purposes
"""
from django.conf import settings
from django.contrib.messages import get_messages

from hsreplaynet.features.models import Feature


def userdata(request):
	is_authenticated = bool(request.user.is_authenticated)  # Django 1.10 hack
	data = {
		"is_authenticated": is_authenticated,
		"card_art_url": settings.HEARTHSTONE_ART_URL,
	}

	storage = get_messages(request)
	data["messages"] = [{
		"level": m.level_tag, "tags": m.extra_tags, "text": m.message
	} for m in storage]

	if is_authenticated:
		data["userid"] = request.user.pk
		data["username"] = request.user.username
		data["email"] = request.user.email
		data["battletag"] = request.user.battletag
		data["locale"] = request.user.locale

		if request.user.is_premium and not request.COOKIES.get("free-mode") == "true":
			data["premium"] = True

		if request.user.is_staff:
			data["staff"] = True

		data["accounts"] = []
		for acc in request.user.blizzard_accounts.all():
			data["accounts"].append({
				"lo": acc.account_lo,
				"battletag": acc.battletag,
				"region": acc.region,
				"display": str(acc),
			})

	data["features"] = {}
	for feature in Feature.objects.all():
		is_enabled = bool(feature.enabled_for_user(request.user))  # Django 1.10 hack
		if not is_enabled:
			continue

		data["features"][feature.name] = {
			"enabled": is_enabled
		}
		if feature.read_only:
			data["features"][feature.name]["read_only"] = True

	# IP country (geolocation done by Cloudflare)
	# Note: This is meant to be used as a hint; users can send it themselves.
	# Don't use it as an absolute.
	if "HTTP_CF_IPCOUNTRY" in request.META:
		data["ipcountry"] = request.META["HTTP_CF_IPCOUNTRY"]

	return {"userdata": data}
