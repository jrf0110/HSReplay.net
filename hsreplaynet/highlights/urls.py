from django.conf.urls import url
from django.views.generic import RedirectView
from . import views


my_highlights = views.MyHighlightsView.as_view()


urlpatterns = [
	url(r"^$", RedirectView.as_view(pattern_name="my_highlights", permanent=False)),
	url(r"^mine/$", my_highlights, name="my_highlights"),
]
