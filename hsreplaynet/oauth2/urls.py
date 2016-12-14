from django.conf.urls import url
from oauth2_provider import views as oauth2_views
from . import views


app_list_view = views.ApplicationListView.as_view()
app_update_view = views.ApplicationUpdateView.as_view()
authorization_view = views.AuthorizationView.as_view()
login_view = views.OAuth2LoginView.as_view()


urlpatterns = [
	url(r"^applications/$", app_list_view, name="oauth2_app_list"),
	url(r"^application/(?P<pk>\d+)/$", app_update_view, name="oauth2_app_update"),
	url(
		r"^application/(?P<pk>\d+)/reset_secret/$",
		views.ResetSecretView.as_view(),
		name="oauth2_reset_secret"
	),
	url(
		r"^application/(?P<pk>\d+)/revoke_all_tokens/$",
		views.RevokeAllTokensView.as_view(), name="oauth2_revoke_all_tokens"
	),
	url(r"^authorize/$", authorization_view, name="authorize"),
	url(r"^login/$", login_view, name="oauth2_login"),
	url(r"^token/$", oauth2_views.TokenView.as_view(), name="token"),
]
