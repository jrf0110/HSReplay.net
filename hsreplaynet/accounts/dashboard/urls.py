from django.conf.urls import url
from . import views


UUID4_RE = r"[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}"


urlpatterns = [
	url(r"^$", views.EditAccountView.as_view(), name="account_edit"),
	url(r"^api/$", views.APIAccountView.as_view(), name="account_api"),
	url(r"^api/hooks/new/$", views.WebhookCreateView.as_view(), name="account_new_webhook"),
	url(
		r"^api/hooks/(?P<pk>%s)/delete/$" % (UUID4_RE),
		views.WebhookDeleteView.as_view(), name="account_delete_webhook"
	),
	url(
		r"^api/hooks/(?P<pk>%s)/$" % (UUID4_RE),
		views.WebhookUpdateView.as_view(), name="account_update_webhook"
	),
	url(r"^delete/$", views.DeleteAccountView.as_view(), name="account_delete"),
	url(r"^make_primary/$", views.MakePrimaryView.as_view(), name="account_make_primary"),

	# OAuth2
	url(r"^applications/$", views.ApplicationListView.as_view(), name="oauth2_app_list"),
	url(
		r"^application/(?P<pk>\d+)/$",
		views.ApplicationUpdateView.as_view(), name="oauth2_app_update"
	),
	url(
		r"^application/(?P<pk>\d+)/reset_secret/$",
		views.ResetSecretView.as_view(), name="oauth2_reset_secret"
	),
	url(
		r"^application/(?P<pk>\d+)/revoke_all_tokens/$",
		views.RevokeAllTokensView.as_view(), name="oauth2_revoke_all_tokens"
	),
	url(r"^revoke/$", views.UserRevocationView.as_view(), name="oauth2_revoke_access"),
]
