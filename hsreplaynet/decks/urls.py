from django.conf.urls import url
from . import views
from .api import GetOrCreateDeckView


deck_detail = views.DeckDetailView.as_view()
deck_list = views.DeckListView.as_view()
my_deck_ids = views.MyDeckIDsView.as_view()
trending_decks = views.TrendingDecksView.as_view()


urlpatterns = [
	url(r"^$", deck_list, name="deck_list"),
	url(r"^mine/$", my_deck_ids, name="my_deck_ids"),
	url(r"^trending/", trending_decks, name="trending_decks"),
	url(r"^canonical/json/$", views.canonical_decks, name="canonical_decks"),
	url(r"^(?P<id>\w+)/$", deck_detail, name="deck_detail"),
]

api_urlpatterns = [
	url(r"^v1/decks/$", GetOrCreateDeckView.as_view()),
]
