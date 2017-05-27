from oauth2_provider.ext.rest_framework import OAuth2Authentication, TokenHasResourceScope
from rest_framework import serializers
from rest_framework.mixins import CreateModelMixin, ListModelMixin, RetrieveModelMixin
from rest_framework.viewsets import GenericViewSet
from hsreplaynet.api.permissions import IsOwnerOrStaff
from hsreplaynet.api.serializers import UserSerializer
from hsreplaynet.utils.influx import influx_metric
from .models import WebhookEndpoint


class WebhookSerializer(serializers.ModelSerializer):
	user = UserSerializer(read_only=True)

	class Meta:
		fields = (
			"uuid", "user", "url", "is_active", "max_triggers", "secret", "created", "modified"
		)
		read_only_fields = ("user", )
		extra_kwargs = {"secret": {"write_only": True}}
		model = WebhookEndpoint

	def create(self, validated_data):
		validated_data["user"] = self.context["request"].user
		ret = WebhookEndpoint.objects.create(**validated_data)
		influx_metric("hsreplaynet_webhook_create", {
			"source": "api-oauth2",
			"client_id": self.context["request"].auth.application.client_id,
			"uuid": str(ret.uuid),
		})
		return ret


class WebhookViewSet(CreateModelMixin, ListModelMixin, RetrieveModelMixin, GenericViewSet):
	authentication_classes = (OAuth2Authentication, )
	permission_classes = (IsOwnerOrStaff, TokenHasResourceScope)
	queryset = WebhookEndpoint.objects.filter(is_deleted=False)
	serializer_class = WebhookSerializer
	required_scopes = ["webhooks"]

	def get_queryset(self):
		queryset = super().get_queryset()
		user = self.request.user
		if not user.is_authenticated:
			return queryset.none()
		return queryset.filter(user=user)
