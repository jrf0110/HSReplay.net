from django.conf.urls import url
from . import views


deck_archetypes = views.ArchetypesView.as_view()
card_detail = views.CardDetailView.as_view()
card_editor = views.CardEditorView.as_view()
card_list = views.CardListView.as_view()
card_stats = views.CardStatsView.as_view()
my_card_stats = views.MyCardStatsView.as_view()
popular_cards = views.PopularCardsView.as_view()


urlpatterns = [
	url(r"^$", card_list, name="card_list"),
	url(r"^archetypes/$", deck_archetypes, name="deck_archetypes"),
	url(r"^counters/$", views.counters, name="deck_counters"),
	url(r"^editor/", card_editor, name="card_editor"),
	url(r"^mine/$", my_card_stats, name="my_card_stats"),
	url(r"^popular/$", popular_cards, name="popular_cards"),
	url(r"^stats/$", card_stats, name="card_stats"),
	url(r"^winrates/$", views.winrates, name="deck_winrates"),
	url(r"^(?P<pk>\w+)/$", card_detail, name="card_detail"),
]
