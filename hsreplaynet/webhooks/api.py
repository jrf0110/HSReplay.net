from rest_framework import serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.mixins import CreateModelMixin, ListModelMixin, RetrieveModelMixin
from rest_framework.viewsets import GenericViewSet
from hsreplaynet.api.permissions import IsOwnerOrStaff
from hsreplaynet.api.serializers import UserSerializer
from .models import Webhook


class WebhookSerializer(serializers.ModelSerializer):
	user = UserSerializer()

	class Meta:
		fields = ("uuid", "user", "url", "is_active", "max_triggers", "created", "modified")
		read_only_fields = ("user", )
		model = Webhook

	def create(self, validated_data):
		validated_data["user"] = self.context["request"].user
		return Webhook.objects.create(**validated_data)


class WebhookViewSet(CreateModelMixin, ListModelMixin, RetrieveModelMixin, GenericViewSet):
	authentication_classes = (SessionAuthentication, )
	permission_classes = (IsOwnerOrStaff, )
	queryset = Webhook.objects.filter(is_deleted=False)
	serializer_class = WebhookSerializer

	def get_queryset(self):
		queryset = super().get_queryset()
		user = self.request.user
		if not user.is_authenticated:
			return queryset.none()
		return queryset.filter(user=user)
