from django.contrib.sitemaps import Sitemap
from django.urls import reverse
from django_hearthstone.cards.models import Card
from .articles.models import Article


class StaticViewSitemap(Sitemap):
	changefreq = "daily"
	priority = 1.0

	def items(self):
		return [
			"home",
			"articles_article_list",
			"trending_decks",
			"deck_list",
			"card_stats",
			"card_gallery",
			"premium"
		]

	def changefreq(self, item):
		if item in ["home", "premium"]:
			return "weekly"
		return "daily"

	def location(self, item):
		return reverse(item)


class CardSitemap(Sitemap):
	changefreq = "daily"

	def items(self):
		return Card.objects.all()

	def priority(self, card):
		if not card.collectible:
			return 0.4
		return 0.6

	def changefreq(self, card):
		if not card.collectible:
			return "monthly"
		return "daily"


class ArticleSitemap(Sitemap):
	changefreq = "monthly"
	priority = 0.8

	def items(self):
		return Article.objects.filter(listed=True).filter(draft=False)


SITEMAPS = {
	"static": StaticViewSitemap,
	"cards": CardSitemap,
	"articles": ArticleSitemap,
}
