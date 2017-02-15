from django.conf.urls import include, url
from . import views


billing_settings = views.BillingSettingsView.as_view()
update_card = views.UpdateCardView.as_view()
subscribe = views.SubscribeView.as_view()
cancel_subscription = views.CancelSubscriptionView.as_view()

urlpatterns = [
	url(r"^$", billing_settings, name="billing_methods"),
	url(r"^card/update/$", update_card, name="billing_update_card"),
	url(r"^stripe/", include("djstripe.urls", namespace="djstripe")),
	url(r"^subscribe/", subscribe, name="premium_subscribe"),
	url(r"^cancel-subscription/", cancel_subscription, name="premium_cancel"),
]
