from django.conf.urls import url
from . import views


profile_highlights = views.HighlightsView.as_view()
profile_packs = views.PackListView.as_view()


urlpatterns = [
	url(r"^highlights/$", profile_highlights, name="profile_highlights"),
	url(r"^packs/$", profile_packs, name="profile_packs"),
]
