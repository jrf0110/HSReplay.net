from rest_framework.response import Response
from rest_framework.views import APIView

from hsreplaynet.api.authentication import AuthTokenAuthentication
from hsreplaynet.api.permissions import LegacyAPIKeyPermission


class DeckInventory(APIView):
	authentication_classes = (AuthTokenAuthentication, )
	permission_classes = (LegacyAPIKeyPermission, )

	def get(self, request, format=None):
		deck_ids = ["8WXR0C3ebnCXUguwT2fkbg", "PSIyZvx1QAOcMcWvGtP4Oh"]
		return Response(deck_ids)
