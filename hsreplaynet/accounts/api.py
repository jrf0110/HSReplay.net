from allauth.socialaccount.models import SocialAccount
from oauth2_provider.contrib.rest_framework import OAuth2Authentication
from rest_framework.authentication import SessionAuthentication
from rest_framework.generics import ListAPIView
from rest_framework.serializers import HyperlinkedModelSerializer, SerializerMethodField

from hearthsim.identity.oauth2.permissions import OAuth2HasScopes
from hsreplaynet.api.serializers import UserSerializer


class TwitchSocialAccountSerializer(HyperlinkedModelSerializer):
	extra_data = SerializerMethodField()
	user = UserSerializer()

	class Meta:
		model = SocialAccount
		fields = ("uid", "provider", "extra_data", "user")

	def get_extra_data(self, instance):
		# This method is needed because the JSONField used by allauth
		# is not the postgres JSONField and the API returns raw json
		# instead of a converted object.
		return instance.extra_data


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
