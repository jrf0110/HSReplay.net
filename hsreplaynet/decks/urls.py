from django.conf.urls import url
from django.views.generic import RedirectView
from . import views
from .api import DeckDetailView, GetOrCreateDeckView


archetype_detail = views.ArchetypeDetailView.as_view()

card_detail = views.CardDetailView.as_view()
card_editor = views.CardEditorView.as_view()
card_stats = views.CardStatsView.as_view()
my_card_stats = views.MyCardStatsView.as_view()

deck_detail = views.DeckDetailView.as_view()
deck_list = views.DeckListView.as_view()
trending_decks = views.TrendingDecksView.as_view()
my_decks = views.MyDecksView.as_view()
meta_overview = views.MetaOverviewView.as_view()
archetype_analysis = views.ArchetypeAnalysisView.as_view()
update_cluster_archetype = views.ClusterSnapshotUpdateView.as_view()


urlpatterns = [
	url(r"^archetypes/analysis/$", archetype_analysis, name="archetype_analysis"),
	url(
		r"^archetypes/(?P<id>\w+)/(?P<slug>[\w-]+)?",
		archetype_detail,
		name="archetype_detail"
	),
	url(r"^cards/$", card_stats, name="card_stats"),
	url(r"^cards/editor/", card_editor, name="card_editor"),
	url(r"^cards/gallery/$", RedirectView.as_view(pattern_name="card_stats", permanent=True)),
	url(r"^cards/mine/$", my_card_stats, name="my_card_stats"),
	url(r"^cards/(?P<pk>\w+)/(?P<slug>[\w-]+)?", card_detail, name="card_detail"),
	url(
		r"^clusters/latest/(?P<player_class>\w+)/(?P<cluster_id>\w+)/",
		update_cluster_archetype,
		name="update_cluster_archetype"
	),
	url(r"^decks/$", deck_list, name="deck_list"),
	url(r"^decks/mine/$", my_decks, name="my_decks"),
	url(r"^decks/trending/", trending_decks, name="trending_decks"),
	url(r"^decks/(?P<id>\w+)/$", deck_detail, name="deck_detail"),
	url(r"^meta/$", meta_overview, name="meta_overview"),
]

api_urlpatterns = [
	url(r"^v1/decks/$", GetOrCreateDeckView.as_view()),
	url(r"^v1/decks/(?P<shortid>\w+)/$", DeckDetailView.as_view()),
]
