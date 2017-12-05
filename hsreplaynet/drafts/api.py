from oauth2_provider.contrib.rest_framework import OAuth2Authentication
from rest_framework.authentication import SessionAuthentication
from rest_framework.serializers import HyperlinkedModelSerializer

from .models import ArenaDraft, DungeonDraft


class ArenaDraftSerializer(HyperlinkedModelSerializer):
	authentication_classes = (SessionAuthentication, OAuth2Authentication)

	class Meta:
		model = ArenaDraft

	def get_queryset(self):
		queryset = super().get_queryset()
		return queryset.filter(user=self.request.user)


class DungeonDraftSerializer(HyperlinkedModelSerializer):
	authentication_classes = (SessionAuthentication, OAuth2Authentication)

	class Meta:
		model = DungeonDraft

	def get_queryset(self):
		queryset = super().get_queryset()
		return queryset.filter(user=self.request.user)


# Views:
# - Create a new draft, empty with just deck id
# - Add choices to a draft (Have to be able to add 3 at once at least)
# - Update a specific choice ("pick" the choice)
# - Update a draft (Advance in wins or losses, retire the run, set rewards, ...)
# A whole draft can be added in two api calls: One to create draft, one to add choices.
