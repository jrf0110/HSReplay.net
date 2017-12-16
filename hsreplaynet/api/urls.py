from django.conf.urls import include, url
from rest_framework.routers import DefaultRouter

from hearthsim.identity.accounts.api import AuthTokenViewSet
from hsreplaynet.accounts.urls import api_urlpatterns as accounts_urlpatterns
from hsreplaynet.analytics.urls import api_urlpatterns as analytics_urlpatterns
from hsreplaynet.decks.api import ArchetypeViewSet
from hsreplaynet.decks.urls import api_urlpatterns as decks_urlpatterns
from hsreplaynet.features.api import FeatureViewSet
from hsreplaynet.features.urls import api_urlpatterns as features_urlpatterns
from hsreplaynet.packs.api import PackViewSet
from hsreplaynet.webhooks.api import WebhookViewSet

from . import views


router = DefaultRouter()
router.register(r"archetypes", ArchetypeViewSet)
router.register(r"features", FeatureViewSet)
router.register(r"uploads", views.games.UploadEventViewSet)
router.register(r"packs", PackViewSet)
router.register(r"tokens", AuthTokenViewSet)
router.register(r"webhooks", WebhookViewSet)

urlpatterns = [
	url(r"^v1/comments/(?P<pk>\d+)/$", views.comments.CommentDetailView.as_view()),
	url(r"^v1/games/$", views.games.GameReplayList.as_view()),
	url(r"^v1/games/(?P<shortid>.+)/$", views.games.GameReplayDetail.as_view()),
	url(r"^api-auth/", include("rest_framework.urls", namespace="rest_framework")),
]

urlpatterns += accounts_urlpatterns
urlpatterns += decks_urlpatterns
urlpatterns += analytics_urlpatterns
urlpatterns += features_urlpatterns

urlpatterns += [url(r"v1/", include(router.urls))]
