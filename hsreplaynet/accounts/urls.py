from django.conf.urls import include, url
from . import views


urlpatterns = [
	url(r"^$", views.EditAccountView.as_view(), name="account_edit"),
	url(r"^api/$", views.APIAccountView.as_view(), name="account_api"),
	url(r"^claim/(?P<id>[\w-]+)/$", views.ClaimAccountView.as_view(), name="account_claim"),
	url(r"^delete/$", views.DeleteAccountView.as_view(), name="account_delete"),
	url(r"^make_primary/$", views.MakePrimaryView.as_view(), name="account_make_primary"),
	url(r"^", include("allauth.urls")),
]
