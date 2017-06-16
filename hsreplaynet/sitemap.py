from django.contrib.sitemaps import Sitemap
from django_hearthstone.cards.models import Card


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


SITEMAPS = {
	"cards": CardSitemap,
}
