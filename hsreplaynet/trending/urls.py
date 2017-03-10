from django.conf.urls import url
from . import views


trending_all = views.TrendingAllView.as_view()


urlpatterns = [
	url(r"^$", trending_all, name="trending_all"),
]
