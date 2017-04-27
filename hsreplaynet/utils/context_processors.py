"""
Context processors for billing/premium purposes
"""
from django.conf import settings
from django.contrib.messages import get_messages


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
		data["battletag"] = request.user.battletag
		data["locale"] = request.user.locale

		if request.user.is_premium and not request.COOKIES.get("free-mode") == "true":
			data["premium"] = True

		if request.user.is_staff:
			data["staff"] = True

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

	quest_contributors = (
		"/cards/41222/the-caverns-below",
		"/cards/41499/unite-the-murlocs",
		"/cards/41856/lakkari-sacrifice",
	)
	if hasattr(request, "head") and request.head.canonical_url.endswith(quest_contributors):
		if "groups" not in data:
			data["groups"] = []
		data["groups"].append("feature:quest-contributors")

	return {"userdata": data}
