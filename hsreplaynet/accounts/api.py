from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.generics import CreateAPIView
from rest_framework.mixins import CreateModelMixin, RetrieveModelMixin, UpdateModelMixin
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED
from rest_framework.viewsets import GenericViewSet
from hearthsim_identity.accounts.models import AccountClaim, AuthToken
from hsreplaynet.api.authentication import AuthTokenAuthentication, RequireAuthToken
from hsreplaynet.api.permissions import APIKeyPermission


class AccountClaimSerializer(serializers.Serializer):
	url = serializers.ReadOnlyField(source="get_absolute_url")
	full_url = serializers.ReadOnlyField(source="get_full_url")
	created = serializers.ReadOnlyField()


class CreateAccountClaimView(CreateAPIView):
	authentication_classes = (AuthTokenAuthentication, )
	permission_classes = (RequireAuthToken, APIKeyPermission)
	queryset = AccountClaim.objects.all()
	serializer_class = AccountClaimSerializer

	def create(self, request):
		if request.auth_token.user and not request.auth_token.user.is_fake:
			raise ValidationError("This token has already been claimed.")
		claim, _ = AccountClaim.objects.get_or_create(
			token=request.auth_token,
			defaults={"api_key": request.api_key}
		)
		serializer = self.get_serializer(claim)
		headers = self.get_success_headers(serializer.data)
		response = Response(serializer.data, status=HTTP_201_CREATED, headers=headers)
		return response


class UserSerializer(serializers.Serializer):
	id = serializers.IntegerField(read_only=True)
	battletag = serializers.SerializerMethodField()
	username = serializers.SerializerMethodField()

	def get_battletag(self, instance):
		if "request" in self.context and self.context["request"].user == instance:
			return instance.battletag

	def get_username(self, instance):
		if "request" in self.context and self.context["request"].user == instance:
			return instance.username

	def to_representation(self, instance):
		if instance.is_fake:
			return None
		return super(UserSerializer, self).to_representation(instance)


class AuthTokenSerializer(serializers.HyperlinkedModelSerializer):
	key = serializers.UUIDField(read_only=True)
	user = UserSerializer(read_only=True)
	test_data = serializers.BooleanField(default=False)

	class Meta:
		model = AuthToken
		fields = ("key", "user", "test_data")

	def create(self, data):
		api_key = self.context["request"].api_key
		data["creation_apikey"] = api_key
		ret = super(AuthTokenSerializer, self).create(data)
		# Create a "fake" user to correspond to the AuthToken
		ret.create_fake_user(save=False)
		ret.save()
		return ret


class AuthTokenViewSet(
	CreateModelMixin, UpdateModelMixin, RetrieveModelMixin, GenericViewSet
):
	authentication_classes = (AuthTokenAuthentication, )
	permission_classes = (APIKeyPermission, )
	queryset = AuthToken.objects.all()
	serializer_class = AuthTokenSerializer
