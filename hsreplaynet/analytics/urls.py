from django.conf.urls import url
from .views import card_inventory as inv, get_filters
from .views import fetch_query_results as query
from .views import fetch_report_results as fetch_report


urlpatterns = [
	url(r"^filters$", get_filters, name="analytics_filters"),
	url(r"^inventory/card/(?P<card_id>\w+)$", inv, name="analytics_card_inventory"),
	url(r"^query/(?P<name>\w+)$", query, name="analytics_fetch_query_results"),
	url(r"^report/(?P<name>\w+)$", fetch_report, name="analytics_fetch_report_results"),
]
