import re
from django import template
from django.conf import settings
from django.contrib.staticfiles.templatetags.staticfiles import static
from django.utils.safestring import mark_safe
from hsreplaynet.games.models import GameReplay


register = template.Library()


@register.simple_tag
def joust_static(path):
	return settings.JOUST_STATIC_URL + path


@register.simple_tag
def get_featured_game():
	id = getattr(settings, "FEATURED_GAME_ID", None)
	if not id:
		return

	try:
		replay = GameReplay.objects.get(shortid=id)
	except GameReplay.DoesNotExist:
		replay = None
	return replay


@register.simple_tag
def hearthstonejson(build=None, locale="enUS"):
	if not build:
		build = "latest"
	return settings.HEARTHSTONEJSON_URL % {"build": build, "locale": locale}


@register.simple_tag
def setting(name):
	return getattr(settings, name, "")


@register.simple_tag
def adunit(slot, responsive=True):
	client = getattr(settings, "GOOGLE_ADSENSE", "")
	if not client:
		return ""
	attributes = {
		"class": "adsbygoogle",
		"data-ad-client": client,
		"data-ad-slot": str(slot),
	}
	if responsive:
		attributes["data-ad-format"] = "auto"
	attrlist = " ".join('%s="%s"' % (k, v) for k, v in attributes.items())
	html = '<ins %s></ins>' % (attrlist)
	return mark_safe(html)


@register.simple_tag(takes_context=True)
def static_absolute(context, value):
	request = context.request
	value = static(value)
	# check whether scheme is present according to RFC 3986
	if not re.match("[a-z]([a-z0-9+-.])*:", value, re.IGNORECASE):
		value = "%s://%s%s" % (request.scheme, request.get_host(), value)
	return value
