from django.conf.urls import include, url


urlpatterns = [
	url(r"^stripe/", include("djstripe.urls", namespace="djstripe")),
]
