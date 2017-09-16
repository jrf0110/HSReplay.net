from django.conf.urls import url

from .api import SetFeatureView
from .views import FeatureInviteRedeemView


urlpatterns = [
	url(r"^redeem/$", FeatureInviteRedeemView.as_view(), name="feature_invite_redeem"),
]

api_urlpatterns = [
	url(r"^v1/features/(?P<name>[\w-]+)/$", SetFeatureView.as_view()),
]
