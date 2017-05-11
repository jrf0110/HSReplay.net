from django.conf.urls import include, url
from . import views
from .api import CreateAccountClaimView
from ..utils import UUID4_RE
from ..webhooks.views import WebhookCreateView, WebhookDeleteView, WebhookUpdateView


urlpatterns = [
	url(r"^$", views.EditAccountView.as_view(), name="account_edit"),
	url(r"^api/$", views.APIAccountView.as_view(), name="account_api"),
	url(r"^api/hooks/new/$", WebhookCreateView.as_view(), name="account_new_webhook"),
	url(
		r"^api/hooks/(?P<pk>%s)/delete/$" % (UUID4_RE),
		WebhookDeleteView.as_view(), name="account_delete_webhook"
	),
	url(
		r"^api/hooks/(?P<pk>%s)/$" % (UUID4_RE),
		WebhookUpdateView.as_view(), name="account_update_webhook"
	),
	url(r"^claim/(?P<id>[\w-]+)/$", views.ClaimAccountView.as_view(), name="account_claim"),
	url(r"^delete/$", views.DeleteAccountView.as_view(), name="account_delete"),
	url(r"^make_primary/$", views.MakePrimaryView.as_view(), name="account_make_primary"),
	url(r"^login/", views.LoginView.as_view(), name="account_login"),
	url(r"^", include("allauth.urls")),
]

api_urlpatterns = [
	url(r"^v1/claim_account/$", CreateAccountClaimView.as_view()),
]
