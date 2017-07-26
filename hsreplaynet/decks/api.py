from django_hearthstone.cards.models import Card
from rest_framework import serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import NotFound
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.mixins import (
	CreateModelMixin, DestroyModelMixin, ListModelMixin, RetrieveModelMixin, UpdateModelMixin
)
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK, HTTP_201_CREATED, HTTP_400_BAD_REQUEST
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet
from hsreplaynet.api.permissions import UserHasFeature
from .models import Archetype, ArchetypeTrainingDeck, Deck


class ArchetypeSerializer(serializers.ModelSerializer):
	player_class_name = serializers.SerializerMethodField()

	class Meta:
		model = Archetype
		fields = ("id", "name", "player_class", "player_class_name")

	def get_player_class_name(self, instance):
		return instance.player_class.name


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
	digest = serializers.CharField(read_only=True)
	shortid = serializers.CharField(read_only=True)
	cards = serializers.SerializerMethodField(read_only=True)

	class Meta:
		model = Deck
		fields = ("id", "archetype", "shortid", "cards", "digest")

	def get_cards(self, value):
		return value.cards.values_list("dbf_id", flat=True)

	def update(self, instance, validated_data):
		old_archetype = instance.archetype
		new_archetype = validated_data["archetype"]
		result = super(DeckSerializer, self).update(instance, validated_data)

		if old_archetype != new_archetype:
			if old_archetype:
				Archetype.objects.update_signatures(archetype=old_archetype)
			if new_archetype:
				Archetype.objects.update_signatures(archetype=new_archetype)

			instance.sync_archetype_to_firehose()

		return result


class ArchetypeTrainingDeckSerializer(serializers.ModelSerializer):
	archetype = ArchetypeSerializer()
	deck = DeckSerializer()

	class Meta:
		model = ArchetypeTrainingDeck
		fields = ("id", "deck", "archetype", "is_validation_deck")


class CreateArchetypeTrainingDeckSerializer(serializers.ModelSerializer):
	class Meta:
		model = ArchetypeTrainingDeck
		fields = ("id", "deck", "archetype", "is_validation_deck")


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
		try:
			return self.queryset.model.objects.get_by_shortid(self.kwargs["shortid"])
		except Deck.DoesNotExist:
			raise NotFound()


class ArchetypeViewSet(
	CreateModelMixin, ListModelMixin, RetrieveModelMixin, UpdateModelMixin, GenericViewSet
):
	authentication_classes = (SessionAuthentication, )
	permission_classes = (UserHasFeature("archetype-selection"), )
	queryset = Archetype.objects.all()
	serializer_class = ArchetypeSerializer


class ArchetypeTrainingDeckViewSet(
	CreateModelMixin, ListModelMixin, RetrieveModelMixin, UpdateModelMixin, DestroyModelMixin,
	GenericViewSet
):
	authentication_classes = (SessionAuthentication, )
	permission_classes = (UserHasFeature("archetype-training"), )
	queryset = ArchetypeTrainingDeck.objects.all()

	def get_serializer_class(self):
		if self.request.method in ["PATCH", "POST"]:
			return CreateArchetypeTrainingDeckSerializer
		return ArchetypeTrainingDeckSerializer
