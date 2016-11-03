from django import template
from django.conf import settings
from hsreplaynet.features.models import Feature
from hsreplaynet.utils.instrumentation import error_handler

register = template.Library()


@register.simple_tag(takes_context=True)
def feature(context, feature_name):
	"""
	Expected usage is:

	{% feature "winrates" as winrates %}
	{% if winrates.is_enabled %}
		...
		{% if winrates.read_only %} ... {% endif %}
		...
	{% endif %}
	"""
	feature_context = {
		"is_enabled": True,
		"read_only": False
	}

	if settings.DEBUG:
		# Feature policies are not enforced in development mode
		return feature_context

	user = context["request"].user

	try:
		feature = Feature.objects.get(name=feature_name)
	except Feature.DoesNotExist as e:
		error_handler(e)
		# Missing features are treated as if they are set to FeatureStatus.STAFF_ONLY
		# Occurs when new feature code is deployed before the DB is updated
		feature_context["is_enabled"] = user.is_staff
	else:
		feature_context["is_enabled"] = feature.enabled_for_user(user)
		feature_context["read_only"] = feature.read_only

	return feature_context


@register.tag
def featureguard(parser, token):
	"""
	Expected usage:

	{% featureguard "winrate" %}
		...
	{% endfeatureguard %}
	"""
	try:
		tag_name, feature_name = token.split_contents()
	except ValueError:
		raise template.TemplateSyntaxError(
			"%r tag requires exactly one argument" % token.contents.split()[0]
		)
	if not (feature_name[0] == feature_name[-1] and feature_name[0] in ('"', "'")):
		raise template.TemplateSyntaxError(
			"%r tag's argument should be in quotes" % tag_name
		)
	nodelist = parser.parse(('end' + tag_name,))
	parser.delete_first_token()
	return GuardNode(feature_name[1:-1], nodelist)


class GuardNode(template.Node):
	def __init__(self, feature_name, nodelist):
		self.feature_name = feature_name
		self.nodelist = nodelist

	def render(self, context):
		feature_context = feature(context, self.feature_name)
		if feature_context["is_enabled"]:
			return self.nodelist.render(context)
		return ''
