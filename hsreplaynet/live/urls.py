from django.conf.urls import url
from . import views


urlpatterns = [
	url(
		r"^distributions/player_class/$", views.fetch_player_class_distribution,
		name="live_fetch_player_class_distribution"
	),
]
