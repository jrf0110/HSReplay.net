from django.urls import path

from . import views


urlpatterns = [
	path("", views.EditAccountView.as_view(), name="account_edit"),
	path("api/", views.APIAccountView.as_view(), name="account_api"),
	path("api/hooks/new/", views.WebhookCreateView.as_view(), name="account_new_webhook"),
	path(
		"api/hooks/<uuid:pk>/delete/",
		views.WebhookDeleteView.as_view(), name="account_delete_webhook"
	),
	path(
		"api/hooks/<uuid:pk>/",
		views.WebhookUpdateView.as_view(), name="account_update_webhook"
	),
	path("delete/", views.DeleteAccountView.as_view(), name="account_delete"),
	path("make_primary/", views.MakePrimaryView.as_view(), name="account_make_primary"),

	# OAuth2
	path("applications/", views.ApplicationListView.as_view(), name="oauth2_app_list"),
	path(
		"application/<int:pk>/",
		views.ApplicationUpdateView.as_view(), name="oauth2_app_update"
	),
	path(
		"application/<int:pk>/reset_secret/",
		views.ResetSecretView.as_view(), name="oauth2_reset_secret"
	),
	path(
		"application/<int:pk>/revoke_all_tokens/",
		views.RevokeAllTokensView.as_view(), name="oauth2_revoke_all_tokens"
	),
	path("revoke/", views.UserRevocationView.as_view(), name="oauth2_revoke_access"),
]
