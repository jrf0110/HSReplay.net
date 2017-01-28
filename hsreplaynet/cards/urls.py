from django.conf.urls import url
from .views import archetypes, winrates, counters, canonicals, carddetail, popularity_report, my_stats


urlpatterns = [
	url(r"^winrates/$", winrates, name="deck_winrates"),
	url(r"^counters/$", counters, name="deck_counters"),
	url(r"^archetypes/mine/$", my_stats, name="my_stats"),
	url(r"^archetypes/$", archetypes, name="deck_archetypes"),
	url(r"^canonicals/$", canonicals, name="canonical_decks"),
	url(r"^popularity/$", popularity_report, name="popularity_report"),
	url(r"^(?P<card_id>\w+)$", carddetail, name="card_detail"),
]
