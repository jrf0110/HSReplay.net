import json
from decimal import Decimal

from django import template
from django.conf import settings
from django.contrib.staticfiles.templatetags.staticfiles import static
from django.urls import reverse
from django.utils.safestring import mark_for_escaping, mark_safe


register = template.Library()


@register.filter(name="json", is_safe=True)
def _json(data):
	"""
	Output the json encoding of its argument.
	This will escape all the HTML/XML special characters with their unicode
	escapes, so it is safe to be output anywhere except for inside a tag
	attribute.
	If the output needs to be put in an attribute, entitize the output of this
	filter.
	"""
	json_str = json.dumps(data)

	# Escape all the XML/HTML special characters.
	escapes = ["<", ">", "&"]
	for c in escapes:
		json_str = json_str.replace(c, r"\u%04x" % (ord(c)))

	return mark_safe(json_str)


@register.filter(is_safe=True)
def htmltime(datetime, fmt="%B %d, %Y"):
	iso = datetime.isoformat()
	formatted = datetime.strftime(fmt)
	html = '<time datetime="%s">%s</time>' % (iso, formatted)
	return mark_safe(html)


@register.simple_tag
def joust_static(path):
	return settings.JOUST_STATIC_URL + path


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
	html = "<ins %s></ins>" % (attrlist)
	return mark_safe(html)


@register.simple_tag(takes_context=True)
def static_absolute(context, value):
	return context.request.build_absolute_uri(static(value))


@register.simple_tag(takes_context=True)
def nav_active(context, name, css="active"):
	request = context.request
	if request.path == reverse(name):
		return mark_safe(' class="%s"' % (mark_for_escaping(css)))
	return ""


@register.simple_tag
def currency_amount(amount, currency):
	from djstripe.utils import get_friendly_currency_amount

	amount = Decimal(amount) / 100
	return get_friendly_currency_amount(amount, currency)


@register.filter
def pretty_card(source):
	from djstripe.models import Card, PaymentMethod, Source

	if isinstance(source, PaymentMethod):
		try:
			source = source.get_object()
		except Card.DoesNotExist:
			return "(invalid card)"

	if isinstance(source, Card):
		brand = source.brand
		last4 = source.last4
	elif isinstance(source, Source):
		if source.type != "card":
			return str(source)

		brand = source.source_data["brand"]
		last4 = source.source_data["last4"]

	return f"{brand} •••• {last4}"
