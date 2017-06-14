from django.conf.urls import url
from . import views
from .api import DeckDetailView, GetOrCreateDeckView


card_detail = views.CardDetailView.as_view()
card_editor = views.CardEditorView.as_view()
card_gallery = views.CardGalleryView.as_view()
card_stats = views.CardStatsView.as_view()
my_card_stats = views.MyCardStatsView.as_view()

deck_detail = views.DeckDetailView.as_view()
deck_list = views.DeckListView.as_view()
my_deck_ids = views.MyDeckIDsView.as_view()
trending_decks = views.TrendingDecksView.as_view()


urlpatterns = [
	url(r"^cards/$", card_stats, name="card_stats"),
	url(r"^cards/editor/", card_editor, name="card_editor"),
	url(r"^cards/mine/$", my_card_stats, name="my_card_stats"),
	url(r"^cards/gallery/$", card_gallery, name="card_gallery"),
	url(r"^cards/(?P<pk>\w+)/(?P<slug>\w+)?", card_detail, name="card_detail"),
	url(r"^decks/$", deck_list, name="deck_list"),
	url(r"^decks/mine/$", my_deck_ids, name="my_deck_ids"),
	url(r"^decks/trending/", trending_decks, name="trending_decks"),
	url(r"^decks/canonical/json/$", views.canonical_decks, name="canonical_decks"),
	url(r"^decks/(?P<id>\w+)/$", deck_detail, name="deck_detail"),
]

api_urlpatterns = [
	url(r"^v1/decks/$", GetOrCreateDeckView.as_view()),
	url(r"^v1/decks/(?P<shortid>\w+)/$", DeckDetailView.as_view()),
]
