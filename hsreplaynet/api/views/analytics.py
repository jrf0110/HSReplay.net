from calendar import timegm

from django.utils.http import http_date
from django.views.decorators.cache import patch_cache_control
from oauth2_provider.contrib.rest_framework import OAuth2Authentication
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.serializers import CharField, ChoiceField, IntegerField, Serializer
from rest_framework.views import APIView

from hearthsim.identity.accounts.models import BlizzardAccount
from hearthsim.identity.oauth2.permissions import OAuth2HasScopes
from hsredshift.analytics.filters import Region
from hsredshift.analytics.library.base import InvalidOrMissingQueryParameterError
from hsreplaynet.analytics.views import (
	_fetch_query_results, _trigger_if_stale,
	get_conditional_response, user_is_eligible_for_query
)
from hsreplaynet.decks.models import Deck
from hsreplaynet.utils.aws.redshift import get_redshift_query


class UserOwnsBlizzardAccount(BasePermission):
	def has_permission(self, request, view):
		return view.serializer.blizzard_account.user == request.user


class GlobalAnalyticsRequestSerializer(Serializer):
	query = CharField()
	deck_id = CharField(required=False)

	def validate_query(self, value):
		# Check and get the query
		self.query = get_redshift_query(value)
		if not self.query:
			raise ValidationError("Query does not exist")

		return value

	def validate_deck_id(self, value):
		if not value:
			return None

		try:
			if value.isdigit():
				deck = Deck.objects.get(id=value)
			else:
				deck = Deck.objects.get_by_shortid(value)
		except Deck.DoesNotExist:
			raise ValidationError("Invalid deck ID")
		else:
			if not deck.eligible_for_global_stats:
				raise ValidationError("Deck is not eligible for global stats")

		return deck.id


class PersonalAnalyticsRequestSerializer(GlobalAnalyticsRequestSerializer):
	region = ChoiceField(choices=[1, 2, 4, 5])
	account_lo = IntegerField()

	def is_valid(self, raise_exception=False):
		ret = super().is_valid(raise_exception=raise_exception)
		if ret:
			try:
				self.blizzard_account = BlizzardAccount.objects.get(
					region=int(self.validated_data["region"]),
					account_lo=int(self.validated_data["account_lo"])
				)
			except BlizzardAccount.DoesNotExist:
				return False

		return ret


class AnalyticsQueryView(APIView):
	authentication_classes = (SessionAuthentication, OAuth2Authentication)
	permission_classes = (OAuth2HasScopes(read_scopes=["tournaments:read"], write_scopes=[]), )

	def get(self, request, **kwargs):
		self.serializer = self.serializer_class(data=request.GET)
		self.serializer.is_valid(raise_exception=True)

		supplied_params = self.serializer.validated_data.copy()
		if "Region" in supplied_params:
			supplied_params["Region"] = Region.from_int(supplied_params["Region"]).name

		query = self.serializer.query

		try:
			parameterized_query = query.build_full_params(supplied_params)
		except InvalidOrMissingQueryParameterError as e:
			raise PermissionDenied(str(e)) from e

		if not user_is_eligible_for_query(request.user, query, parameterized_query):
			raise PermissionDenied("You do not have access to this query.")

		last_modified = parameterized_query.result_as_of
		if last_modified:
			last_modified = timegm(last_modified.utctimetuple())

		response = None

		is_cache_hit = parameterized_query.result_available
		if is_cache_hit:
			_trigger_if_stale(parameterized_query)
			# Try to return a minimal response
			response = get_conditional_response(request, last_modified=last_modified)

		if not response:
			# Resort to a full response
			response = _fetch_query_results(parameterized_query, user=request.user)

		response["last-modified"] = http_date(last_modified)

		# Always send Cache-Control headers
		if parameterized_query.is_personalized or parameterized_query.has_premium_values:
			patch_cache_control(response, no_cache=True, private=True)
		else:
			patch_cache_control(response, no_cache=True, public=True)

		return response


class GlobalAnalyticsQueryView(AnalyticsQueryView):
	serializer_class = GlobalAnalyticsRequestSerializer


class PersonalAnalyticsQueryView(AnalyticsQueryView):
	serializer_class = PersonalAnalyticsRequestSerializer
	permission_classes = (
		IsAuthenticated, UserOwnsBlizzardAccount
	) + AnalyticsQueryView.permission_classes
