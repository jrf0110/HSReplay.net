from django.conf.urls import url
from django.views.generic import RedirectView
from .views import MyReplaysView, PlayListView, ReplayDetailView


urlpatterns = [
	url(r"^$", RedirectView.as_view(pattern_name="my_replays", permanent=False)),
	url(r"^playlist/(?P<id>\w+)$", PlayListView.as_view(), name="games_playlist"),
	url(r"^mine/$", MyReplaysView.as_view(), name="my_replays"),
	url(r"^replay/(?P<id>\w+)$", ReplayDetailView.as_view(), name="old_replay_view"),
]
