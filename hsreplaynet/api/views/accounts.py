from allauth.socialaccount.models import SocialAccount
from oauth2_provider.contrib.rest_framework import OAuth2Authentication
from rest_framework.authentication import SessionAuthentication
from rest_framework.generics import ListAPIView

from hearthsim.identity.oauth2.permissions import OAuth2HasScopes

from ..serializers.accounts import TwitchSocialAccountSerializer


class TwitchSocialAccountListView(ListAPIView):
	queryset = SocialAccount.objects.filter(provider="twitch")
	authentication_classes = (SessionAuthentication, OAuth2Authentication)
	permission_classes = (
		OAuth2HasScopes(read_scopes=["account.social:read"], write_scopes=[]),
	)
	serializer_class = TwitchSocialAccountSerializer

	def get_queryset(self):
		queryset = super().get_queryset()
		return queryset.filter(user=self.request.user)
