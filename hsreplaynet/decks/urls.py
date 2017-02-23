from django.conf.urls import url
from . import views


urlpatterns = [
	url(r"^$", views.deck_list, name="deck_discover"),
	url(r"^mine/$", views.MyDeckIDsView.as_view(), name="my_deck_ids"),
	url(r"^(?P<id>\w+)$", views.deck_detail, name="deck_detail"),
	url(r"^canonical/json/$", views.canonical_decks, name="canonical_decks"),
]
