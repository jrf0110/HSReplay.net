from django import template
from django.conf import settings
from hsreplaynet.features.models import Feature
from hsreplaynet.utils.instrumentation import error_handler

register = template.Library()


def get_feature_context(user, feature_name):
	feature_context = {
		"name": feature_name,
		"is_enabled": True,
		"read_only": False,
	}

	if settings.DEBUG:
		# Feature policies are not enforced in development mode
		return feature_context

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
def feature(parser, token):
	"""
	Expected usage:

	{% feature "winrate" %}
		...
	{% endfeature %}

	or

	{% feature "winrate" as winrate %}
		...
	{% endfeature %}
	"""
	contents = token.split_contents()
	variable = None
	if len(contents) == 2:
		tag_name, feature_name = contents
	elif len(contents) == 4:
		tag_name, feature_name, as_token, variable = contents
		if as_token != "as":
			raise template.TemplateSyntaxError(
				"%r tag's feature should only be followed directly by 'as' keyword" %
				token.contents.split()[0]
			)
	else:
		raise template.TemplateSyntaxError(
			"%r tag requires exactly one argument" % token.contents.split()[0]
		)
	if not (feature_name[0] == feature_name[-1] and feature_name[0] in ('"', "'")):
		raise template.TemplateSyntaxError(
			"%r tag's feature should be in quotes" % tag_name
		)
	if len(contents) == 4 and variable[0] in ('"', "'"):
		raise template.TemplateSyntaxError(
			"%r tag's variable should not be quoted" % tag_name
		)
	nodelist = parser.parse(('endfeature',))
	parser.delete_first_token()
	return GuardNode(feature_name[1:-1], nodelist, variable)


class GuardNode(template.Node):
	def __init__(self, feature_name, nodelist, variable):
		self.feature_name = feature_name
		self.nodelist = nodelist
		self.variable = variable

	def render(self, context):
		feature_context = get_feature_context(context["request"].user, self.feature_name)
		if feature_context["is_enabled"]:
			previous = None
			if self.variable:
				if self.variable in context:
					previous = context[self.variable]
				context[self.variable] = feature_context
			result = self.nodelist.render(context)
			if self.variable:
				if previous:
					context[self.variable] = previous
				else:
					del context[self.variable]
			return result
		return ''
