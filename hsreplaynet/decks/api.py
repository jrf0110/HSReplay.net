from django_hearthstone.cards.models import Card
from rest_framework import serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.mixins import (
	CreateModelMixin, ListModelMixin, RetrieveModelMixin, UpdateModelMixin
)
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK, HTTP_201_CREATED, HTTP_400_BAD_REQUEST
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet
from .models import Archetype, Deck


class DeckSerializer(serializers.Serializer):
	shortid = serializers.CharField(read_only=True)
	format = serializers.IntegerField(min_value=0)
	heroes = serializers.ListField(
		child=serializers.IntegerField(min_value=1),
		min_length=0, max_length=1
	)
	cards = serializers.ListField(
		child=serializers.IntegerField(min_value=1),
		min_length=30, max_length=30
	)

	def save(self):
		self.validated_data["cards"].sort()
		card_ids = [Card.get_string_id(id) for id in self.validated_data["cards"]]
		deck, created = Deck.objects.get_or_create_from_id_list(card_ids)
		self.validated_data["shortid"] = deck.shortid
		return created


class GetOrCreateDeckView(APIView):
	authentication_classes = ()
	permission_classes = ()
	serializer_class = DeckSerializer

	def post(self, request, format=None):
		serializer = self.serializer_class(data=request.data)
		if serializer.is_valid():
			created = serializer.save()
			if created:
				status = HTTP_201_CREATED
			else:
				status = HTTP_200_OK
			return Response(serializer.data, status=status)
		return Response(serializer.errors, status=HTTP_400_BAD_REQUEST)


class ArchetypeSerializer(serializers.ModelSerializer):
	class Meta:
		model = Archetype
		fields = ("name", "player_class")


class ArchetypeViewSet(
	CreateModelMixin, ListModelMixin, RetrieveModelMixin, UpdateModelMixin, GenericViewSet
):
	authentication_classes = (SessionAuthentication, )
	permission_classes = (IsAdminUser, )
	queryset = Archetype.objects.all()
	serializer_class = ArchetypeSerializer
