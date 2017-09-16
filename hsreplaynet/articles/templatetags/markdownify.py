from django import template
from django.utils.safestring import mark_safe

from ..markdown.utils import markdownify as _markdownify


register = template.Library()


@register.filter
def markdownify(md):
	html = _markdownify(md)
	return mark_safe(html)
