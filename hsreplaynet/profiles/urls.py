from django.conf.urls import url
from . import views


profile_highlights = views.HighlightsView.as_view()


urlpatterns = [
	url(r"^highlights/$", profile_highlights, name="profile_highlights"),
]
