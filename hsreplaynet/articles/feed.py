from django.contrib.syndication.views import Feed
from django.urls import reverse_lazy
from django.utils.feedgenerator import Atom1Feed
from markdownx.utils import markdownify
from .models import Article


class LatestArticlesFeed(Feed):
	title = "HSReplay.net Articles"
	link = reverse_lazy("articles_article_list")
	description = "The latest Hearthstone articles from HSReplay.net"
	feed_type = Atom1Feed

	def items(self):
		return Article.objects.exclude(listed=False, draft=False)[:10]

	def item_title(self, item):
		return str(item)

	def item_description(self, item):
		return markdownify(item.contents)

	def item_pubdate(self, item):
		return item.pubdate

	def author_name(self, item):
		if item:
			return str(item.author)
