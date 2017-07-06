from rest_framework import serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK, HTTP_400_BAD_REQUEST
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet
from .models import Feature


class FeatureSerializer(serializers.ModelSerializer):
	enabled_for_user = serializers.SerializerMethodField()
	status = serializers.SerializerMethodField()

	class Meta:
		fields = ("name", "status", "description", "enabled_for_user")
		model = Feature

	def get_enabled_for_user(self, instance):
		if "request" in self.context:
			return instance.enabled_for_user(self.context["request"].user)

	def get_status(self, instance):
		return instance.status.name


class SetFeatureSerializer(serializers.Serializer):
	enabled = serializers.BooleanField()

	def save(self):
		user = self.context["request"].user
		feature = self.context["feature"]
		if self.validated_data["enabled"]:
			feature.add_user_to_authorized_group(user)
		else:
			feature.remove_user(user)


class SetFeatureView(APIView):
	authentication_classes = (SessionAuthentication, )
	permission_classes = (IsAdminUser, )
	serializer_class = SetFeatureSerializer

	def post(self, request, **kwargs):
		context = {
			"request": request,
			"feature": Feature.objects.get(name=self.kwargs.get("name"))
		}
		serializer = self.serializer_class(data=request.data, context=context)
		if serializer.is_valid():
			serializer.save()
			return Response(serializer.data, status=HTTP_200_OK)
		return Response(serializer.errors, status=HTTP_400_BAD_REQUEST)


class FeatureViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
	authentication_classes = (SessionAuthentication, )
	permission_classes = (IsAdminUser, )
	queryset = Feature.objects.all()
	serializer_class = FeatureSerializer
