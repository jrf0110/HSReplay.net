from django.conf.urls import include, url

from hearthsim.identity.accounts.api import CreateAccountClaimView, UserDetailsView

from . import views
from .api import TwitchSocialAccountListView


urlpatterns = [
	url(r"^", include("hsreplaynet.accounts.dashboard.urls")),
	url(r"^claim/(?P<id>[\w-]+)/$", views.ClaimAccountView.as_view(), name="account_claim"),
	url(r"^login/", views.LoginView.as_view(), name="account_login"),
	url(r"^", include("allauth.urls")),
]

api_urlpatterns = [
	url(r"^v1/account/$", UserDetailsView.as_view()),
	url(r"^v1/claim_account/$", CreateAccountClaimView.as_view()),
	url(r"^v1/account/social/twitch/", TwitchSocialAccountListView.as_view()),
]
