from django.conf.urls import url
from . import views


deck_archetypes = views.ArchetypesView.as_view()
card_list = views.CardListView.as_view()
popular_cards = views.PopularCardsView.as_view()
card_detail = views.CardDetailView.as_view()


urlpatterns = [
	url(r"^$", card_list, name="card_list"),
	url(r"^archetypes/$", deck_archetypes, name="deck_archetypes"),
	url(r"^counters/$", views.counters, name="deck_counters"),
	url(r"^popular/$", popular_cards, name="popular_cards"),
	url(r"^winrates/$", views.winrates, name="deck_winrates"),
	url(r"^(?P<pk>\w+)/$", card_detail, name="card_detail"),
]
