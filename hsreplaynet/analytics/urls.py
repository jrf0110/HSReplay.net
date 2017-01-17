from django.conf.urls import url
from .views import card_inventory, get_filters, fetch_query_results


urlpatterns = [
	url(r"^filters$", get_filters, name="analytics_filters"),
	url(r"^inventory/card/(?P<card_id>\w+)$", card_inventory, name="analytics_card_inventory"),
	url(r"^query/(?P<name>\w+)$", fetch_query_results, name="analytics_fetch_query_results"),
]
