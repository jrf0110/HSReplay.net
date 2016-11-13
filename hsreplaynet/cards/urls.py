from django.conf.urls import url
from .views import winrates, counters, archetypes, canonicals


urlpatterns = [
	url(r"^winrates/$", winrates, name="deck_winrates"),
	url(r"^counters/$", counters, name="deck_counters"),
	url(r"^archetypes/$", archetypes, name="deck_archetypes"),
	url(r"^canonicals/$", canonicals, name="canonical_decks"),
]
