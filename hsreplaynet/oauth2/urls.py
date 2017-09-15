from django.conf.urls import url
from oauth2_provider.views import TokenView
from .views import AuthorizationView, OAuth2LoginView


urlpatterns = [
	url(r"^login/$", OAuth2LoginView.as_view(), name="oauth2_login"),
	url(r"^authorize/$", AuthorizationView.as_view(), name="authorize"),
	url(r"^token/$", TokenView.as_view(), name="token"),
]
