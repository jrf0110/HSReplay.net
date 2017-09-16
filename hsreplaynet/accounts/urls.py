from django.conf.urls import include, url

from hearthsim_identity.accounts.api import CreateAccountClaimView

from . import views


urlpatterns = [
	url(r"^", include("hsreplaynet.accounts.dashboard.urls")),
	url(r"^claim/(?P<id>[\w-]+)/$", views.ClaimAccountView.as_view(), name="account_claim"),
	url(r"^login/", views.LoginView.as_view(), name="account_login"),
	url(r"^", include("allauth.urls")),
]

api_urlpatterns = [
	url(r"^v1/claim_account/$", CreateAccountClaimView.as_view()),
]
