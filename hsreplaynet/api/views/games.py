from oauth2_provider.contrib.rest_framework import OAuth2Authentication
from rest_framework.authentication import SessionAuthentication
from rest_framework.generics import ListAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.mixins import CreateModelMixin, RetrieveModelMixin, UpdateModelMixin
from rest_framework.viewsets import GenericViewSet

from hearthsim.identity.accounts.api import (
	AuthTokenAuthentication, LegacyAPIKeyPermission, RequireAuthToken
)
from hearthsim.identity.oauth2.permissions import OAuth2HasScopes
from hsreplaynet.games.models import GameReplay
from hsreplaynet.uploads.models import UploadEvent

from .. import serializers
from ..permissions import IsOwnerOrReadOnly


class WriteOnlyOnceViewSet(
	CreateModelMixin, UpdateModelMixin, RetrieveModelMixin, GenericViewSet
):
	pass


class UploadEventViewSet(WriteOnlyOnceViewSet):
	authentication_classes = (AuthTokenAuthentication, SessionAuthentication)
	permission_classes = (RequireAuthToken, LegacyAPIKeyPermission)
	queryset = UploadEvent.objects.all()
	serializer_class = serializers.games.UploadEventSerializer
	lookup_field = "shortid"


class GameReplayDetail(RetrieveUpdateDestroyAPIView):
	queryset = GameReplay.objects.live()
	serializer_class = serializers.games.GameReplaySerializer
	lookup_field = "shortid"
	permission_classes = (IsOwnerOrReadOnly, )

	def perform_destroy(self, instance):
		instance.is_deleted = True
		instance.save()


class GameReplayList(ListAPIView):
	queryset = GameReplay.objects.live().prefetch_related("user", "global_game__players")
	authentication_classes = (SessionAuthentication, OAuth2Authentication)
	permission_classes = (
		OAuth2HasScopes(read_scopes=["games:read"], write_scopes=["games:write"]),
	)
	serializer_class = serializers.games.GameReplayListSerializer

	def check_permissions(self, request):
		if not request.user.is_authenticated:
			self.permission_denied(request)
		return super().check_permissions(request)

	def get_queryset(self):
		queryset = super().get_queryset()
		user = self.request.user
		if not user.is_staff or self.request.auth:
			# For non-staff, only own games are visible
			queryset = queryset.filter(user=user)
		# Allow filtering on username key
		username = self.request.query_params.get("username", None)
		if username:
			queryset = queryset.filter(user__username=username)
		return queryset
