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

		if request.user.is_premium:
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

	return {"userdata": data}


def canonical_url(request):
	"""
	If the canonical_url attribute is set on the request object,
	returns the corresponding absolute URL.
	"""

	context = {}
	url = getattr(request, "canonical_url", "")
	if url:
		context["canonical_url"] = request.build_absolute_uri(url)
	return context
