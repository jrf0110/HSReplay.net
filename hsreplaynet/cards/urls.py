from django.conf.urls import url
from .views import (
	archetypes, winrates, counters, carddetail, popular_cards, discover
)


urlpatterns = [
	url(r"^$", discover, name="card_discover"),
	url(r"^winrates/$", winrates, name="deck_winrates"),
	url(r"^counters/$", counters, name="deck_counters"),
	url(r"^archetypes/$", archetypes, name="deck_archetypes"),
	url(r"^popular/$", popular_cards, name="popular_cards"),
	url(r"^(?P<card_id>\w+)$", carddetail, name="card_detail"),
]
