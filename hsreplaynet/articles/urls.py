from django.conf.urls import url

from . import views
from .feed import LatestArticlesFeed


detail_view = views.ArticleDetailView.as_view()
list_view = views.ArticleListView.as_view()


urlpatterns = [
	url(r"^$", list_view, name="articles_article_list"),
	url(r"^latest.atom$", LatestArticlesFeed(), name="articles_article_feed"),
	url(r"^(?P<pk>\d+)/(?P<slug>[\w-]+)?", detail_view, name="articles_article_detail"),
]
