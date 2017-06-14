from django.contrib.sitemaps import Sitemap
from django_hearthstone.cards.models import Card


class CardSitemap(Sitemap):
	changefreq = "daily"
	priority = 0.6

	def items(self):
		return Card.objects.all()


SITEMAPS = {
	"cards": CardSitemap,
}
