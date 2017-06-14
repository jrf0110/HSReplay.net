from django_hearthstone.cards.models import Card
from rest_framework import serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.mixins import (
	CreateModelMixin, ListModelMixin, RetrieveModelMixin, UpdateModelMixin
)
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK, HTTP_201_CREATED, HTTP_400_BAD_REQUEST
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet
from .models import Archetype, Deck


class ArchetypeSerializer(serializers.ModelSerializer):
	class Meta:
		model = Archetype
		fields = ("id", "name", "player_class")


class DeckCreationSerializer(serializers.Serializer):
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


class DeckSerializer(serializers.ModelSerializer):
	archetype = serializers.PrimaryKeyRelatedField(
		queryset=Archetype.objects.all(),
		allow_null=True
	)
	shortid = serializers.CharField(read_only=True)
	cards = serializers.SerializerMethodField(read_only=True)

	class Meta:
		model = Deck
		fields = ("archetype", "shortid", "cards")

	def get_cards(self, value):
		return value.cards.values_list("dbf_id", flat=True)

	def update(self, instance, validated_data):
		if instance.archetype != validated_data["archetype"]:
			Archetype.objects.update_signature_for_archetype(
				validated_data["archetype"].id,
				instance.format
			)
		return super(DeckSerializer, self).update(instance, validated_data)


class GetOrCreateDeckView(APIView):
	authentication_classes = ()
	permission_classes = ()
	serializer_class = DeckCreationSerializer

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


class DeckDetailView(RetrieveUpdateAPIView):
	authentication_classes = (SessionAuthentication, )
	permission_classes = (IsAdminUser, )
	queryset = Deck.objects.all()
	serializer_class = DeckSerializer

	def get_object(self):
		return self.queryset.model.objects.get_by_shortid(self.kwargs["shortid"])


class ArchetypeViewSet(
	CreateModelMixin, ListModelMixin, RetrieveModelMixin, UpdateModelMixin, GenericViewSet
):
	authentication_classes = (SessionAuthentication, )
	permission_classes = (IsAdminUser, )
	queryset = Archetype.objects.all()
	serializer_class = ArchetypeSerializer
