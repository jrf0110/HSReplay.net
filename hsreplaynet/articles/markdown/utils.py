import markdown
from django.conf import settings


def markdownify(content):
	return markdown.markdown(content, extensions=settings.MARKDOWN_EXTENSIONS)
