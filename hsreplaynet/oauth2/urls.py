from django.conf import settings
from django.conf.urls import include, url
from oauth2_provider import views as oauth2_views


if settings.DEBUG:
	# Includes application management debug views
	urlpatterns = [
		url(r"^", include("oauth2_provider.urls", namespace="oauth2_provider")),
	]
else:
	urlpatterns = [
		url(r"^authorize/$", oauth2_views.AuthorizationView.as_view(), name="authorize"),
		url(r"^token/$", oauth2_views.TokenView.as_view(), name="token"),
		url(r"^revoke_token/$", oauth2_views.RevokeTokenView.as_view(), name="revoke-token"),
		url(
			r"^authorized_tokens/$",
			oauth2_views.AuthorizedTokensListView.as_view(),
			name="authorized-token-list",
		),
		url(
			r"^authorized_tokens/(?P<pk>\d+)/delete/$",
			oauth2_views.AuthorizedTokenDeleteView.as_view(),
			name="authorized-token-delete"
		),
	]
