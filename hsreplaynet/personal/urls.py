from django.conf.urls import url
from . import views


my_highlights = views.MyHighlightsView.as_view()


urlpatterns = [
	url(r"^highlights/$", my_highlights, name="my_highlights"),
]
