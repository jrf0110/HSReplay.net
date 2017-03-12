from django.conf.urls import url
from . import views


urlpatterns = [
	url(r"^filters$", views.get_filters, name="analytics_filters"),
	url(
		r"^inventory/card/(?P<card_id>\w+)$", views.card_inventory,
		name="analytics_card_inventory"
	),
	url(
		r"^query/(?P<name>\w+)$", views.fetch_query_results,
		name="analytics_fetch_query_results"
	),
	url(
		r"^evict/(?P<name>\w+)$", views.evict_query_from_cache,
		name="analytics_evict_from_cache"
	),
	url(
		r"^release/semaphore/(?P<name>\w+)$", views.release_semaphore,
		name="analytics_release_semaphore"
	),
]
