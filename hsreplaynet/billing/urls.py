from django.conf.urls import include, url
from .views import BillingSettingsView, UpdateCardView


urlpatterns = [
	url(r"^$", BillingSettingsView.as_view(), name="billing_methods"),
	url(r"^card/update/$", UpdateCardView.as_view(), name="billing_update_card"),
	url(r"^stripe/", include("djstripe.urls", namespace="djstripe")),
]
