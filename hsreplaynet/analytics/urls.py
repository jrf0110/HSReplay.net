from django.conf.urls import url
from .views import card_inventory, run_query


urlpatterns = [
	url(r"^inventory/card/(?P<card_id>\w+)$", card_inventory, name="analytics_card_inventory"),
	url(r"^query/(?P<name>\w+)$", run_query, name="analytics_run_query"),
]
