from django.conf.urls import include, url

from . import views


urlpatterns = [
	url(r"^", include("hsreplaynet.accounts.dashboard.urls")),
	url(r"^claim/(?P<id>[\w-]+)/$", views.ClaimAccountView.as_view(), name="account_claim"),
	url(r"^login/", views.LoginView.as_view(), name="account_login"),
	url(r"^", include("allauth.urls")),
]
