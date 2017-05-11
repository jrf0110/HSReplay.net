from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.generics import CreateAPIView
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED
from hsreplaynet.api.authentication import AuthTokenAuthentication, RequireAuthToken
from hsreplaynet.api.permissions import APIKeyPermission
from .models import AccountClaim


class AccountClaimSerializer(serializers.Serializer):
	url = serializers.ReadOnlyField(source="get_absolute_url")
	full_url = serializers.ReadOnlyField(source="get_full_url")
	created = serializers.ReadOnlyField()


class CreateAccountClaimView(CreateAPIView):
	authentication_classes = (AuthTokenAuthentication, )
	permission_classes = (RequireAuthToken, APIKeyPermission)
	queryset = AccountClaim.objects.all()
	serializer_class = serializers.AccountClaimSerializer

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
