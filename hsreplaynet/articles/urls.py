from django.conf.urls import url
from . import views


detail_view = views.ArticleDetailView.as_view()
list_view = views.ArticleListView.as_view()


urlpatterns = [
	url("^$", list_view, name="articles_article_list"),
	url("^(?P<pk>\d+)/(?P<slug>\w+)?", detail_view, name="articles_article_detail"),
]
