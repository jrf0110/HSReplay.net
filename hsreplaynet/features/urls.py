from django.conf.urls import url
from .views import FeatureInviteRedeemView


urlpatterns = [
	url(r"^redeem/$", FeatureInviteRedeemView.as_view(), name="feature_invite_redeem"),
]
