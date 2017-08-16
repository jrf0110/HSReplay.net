import json
from calendar import timegm
from copy import deepcopy
from datetime import datetime
from django.conf import settings
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import (
	Http404, HttpResponse, HttpResponseBadRequest, HttpResponseForbidden, JsonResponse
)
from django.utils.cache import get_conditional_response
from django.utils.decorators import method_decorator
from django.utils.http import http_date
from django.views.decorators.cache import patch_cache_control
from django.views.generic import TemplateView
from hearthstone import enums
from hsredshift.analytics.filters import Region
from hsredshift.analytics.library.base import InvalidOrMissingQueryParameterError
from hsreplaynet.decks.models import Deck
from hsreplaynet.features.decorators import view_requires_feature_access
from hsreplaynet.utils import influx, log
from hsreplaynet.utils.aws.redshift import get_redshift_query
from hsreplaynet.utils.html import RequestMetaMixin
from .processing import (
	deck_is_eligible_for_global_stats, evict_locks_cache,
	execute_query, get_concurrent_redshift_query_queue_semaphore,
)


@staff_member_required
def evict_query_from_cache(request, name):
	parameterized_query = _get_query_and_params(request, name)
	parameterized_query.evict_cache()

	# Clear out any lingering dogpile locks on this query
	evict_locks_cache(parameterized_query)

	return JsonResponse({"msg": "OK"})


@staff_member_required
def evict_all_from_cache(request, name):
	parameterized_query = _get_query_and_params(request, name)
	count = parameterized_query.evict_all_from_cache()

	return JsonResponse({"msg": "OK", "count": count})


@staff_member_required
def refresh_query_from_cache(request, name):
	parameterized_query = _get_query_and_params(request, name)
	parameterized_query.mark_stale()

	# Clear out any lingering dogpile locks on this query
	evict_locks_cache(parameterized_query)

	return _fetch_query_results(parameterized_query, user=request.user)


@staff_member_required
def refresh_all_from_cache(request, name):
	parameterized_query = _get_query_and_params(request, name)
	parameterized_query.mark_all_stale()

	return _fetch_query_results(parameterized_query, user=request.user)


@staff_member_required
def release_semaphore(request, name):
	semaphore = get_concurrent_redshift_query_queue_semaphore(name)
	if semaphore:
		semaphore.reset()
	return JsonResponse({"msg": "OK"})


def _get_query_and_params(request, name):
	query = get_redshift_query(name)
	if not query:
		raise Http404("No query named: %s" % name)

	supplied_params = request.GET.dict()
	deck = None
	if "deck_id" in supplied_params and not supplied_params["deck_id"].isdigit():
		# We got sent a shortid, so we need to translate it into a deck_id int
		try:
			deck = Deck.objects.get_by_shortid(supplied_params["deck_id"])
			supplied_params["deck_id"] = str(deck.id)
		except Deck.DoesNotExist:
			raise Http404("Deck does not exist")

	if query.is_personalized:
		if request.user and request.user.is_authenticated:
			if "Region" not in supplied_params:
				default_blizzard_account = request.user.blizzard_accounts.first()

				if default_blizzard_account:
					supplied_params["Region"] = default_blizzard_account.region.name
					supplied_params["account_lo"] = default_blizzard_account.account_lo
				else:
					raise Http404("User does not have any Blizzard Accounts.")
			elif not request.user.is_staff:
				supplied_region = supplied_params["Region"]
				supplied_account_lo = supplied_params["account_lo"]
				if not (supplied_region.isdigit() and supplied_account_lo.isdigit()):
					return HttpResponseBadRequest()

				user_owns_blizzard_account = request.user.blizzard_accounts.filter(
					region__exact=int(supplied_region),
					account_lo__exact=int(supplied_account_lo)
				).exists()
				if not user_owns_blizzard_account:
					return HttpResponseForbidden()

			if supplied_params["Region"].isdigit():
				supplied_region = supplied_params["Region"]
				if not supplied_region.isdigit():
					return HttpResponseBadRequest()

				region_member = Region.from_int(int(supplied_region))
				supplied_params["Region"] = region_member.name

			try:
				personal_parameterized_query = query.build_full_params(supplied_params)
			except InvalidOrMissingQueryParameterError as e:
				# Return a 400 Bad Request response
				log.warn(str(e))
				return HttpResponseBadRequest()

			if not user_is_eligible_for_query(request.user, query, personal_parameterized_query):
				return HttpResponseForbidden()

			return personal_parameterized_query

		else:
			# Anonymous or Fake Users Can Never Request Personal Stats
			return HttpResponseForbidden()
	else:
		if deck and not deck_is_eligible_for_global_stats(deck):
			return HttpResponseForbidden()

		try:
			parameterized_query = query.build_full_params(supplied_params)
		except InvalidOrMissingQueryParameterError as e:
			# Return a 400 Bad Request response
			log.warn(str(e))
			return HttpResponseBadRequest()

		if not user_is_eligible_for_query(request.user, query, parameterized_query):
			return HttpResponseForbidden()

		return parameterized_query


def user_is_eligible_for_query(user, query, params):
	if user.is_staff:
		return True

	if params.has_premium_values:
		return user.is_authenticated and user.is_premium
	else:
		return True


def fetch_query_results(request, name):
	parameterized_query = _get_query_and_params(request, name)
	if issubclass(parameterized_query.__class__, HttpResponse):
		return parameterized_query

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

	# Add Last-Modified header
	if response.status_code in (200, 304):
		response["Last-Modified"] = http_date(last_modified)

	# Always send Cache-Control headers
	if parameterized_query.is_personalized:
		patch_cache_control(response, no_cache=True, private=True)
	else:
		patch_cache_control(response, no_cache=True, public=True)

	return response


@staff_member_required
def fetch_local_query_results(request, name):
	# This end point is intended only for administrator use.
	# It provides an entry point to force a query to be run locally
	# and by-pass all of the in-flight short circuits.
	# This can be critical in case a query is failing on Lambda, and
	# repeated attempts to run it on lambda are causing it's in-flight status
	# to always be true.
	parameterized_query = _get_query_and_params(request, name)
	return _fetch_query_results(parameterized_query, run_local=True, user=request.user)


def _fetch_query_results(parameterized_query, run_local=False, user=None):
	cache_is_populated = parameterized_query.cache_is_populated
	is_cache_hit = parameterized_query.result_available
	triggered_refresh = False

	if is_cache_hit:
		triggered_refresh = _trigger_if_stale(parameterized_query, run_local)

		response = HttpResponse(
			content=parameterized_query.response_payload_data,
			content_type=parameterized_query.response_payload_type
		)
	elif cache_is_populated and parameterized_query.is_global:
		user_is_premium = user and not user.is_anonymous and user.is_premium
		if (
			parameterized_query.is_backfillable and parameterized_query.is_personalized and
			user_is_premium
		):
			# Premium users should have cache entries even if the result set is empty
			# So we should only reach this block if the user just subscribed
			# And we haven't rerun the global query yet.
			triggered_refresh = True
			attempt_request_triggered_query_execution(parameterized_query, run_local)
			result = {"msg": "Query is processing. Check back later."}
			response = JsonResponse(result, status=202)
		else:
			# There is no content for this permutation of parameters
			# For deck related queries this most likely means that someone hand crafted the URL
			# Or if it's a card related query, then it's a corner case where there is no data
			response = HttpResponse(status=204)
	else:
		# The cache is not populated yet for this query.
		# Perhaps it's a new query or perhaps the cache was recently flushed.
		# So attempt to trigger populating it
		attempt_request_triggered_query_execution(parameterized_query, run_local)
		result = {"msg": "Query is processing. Check back later."}
		response = JsonResponse(result, status=202)

	log.info("Query: %s Cache Populated: %s Cache Hit: %s Is Stale: %s" % (
		cache_is_populated,
		parameterized_query.cache_key,
		is_cache_hit,
		triggered_refresh
	))

	query_fetch_metric_fields = {
		"count": 1,
	}
	query_fetch_metric_fields.update(
		parameterized_query.supplied_non_filters_dict
	)

	influx.influx_metric(
		"redshift_query_fetch",
		query_fetch_metric_fields,
		cache_populated=cache_is_populated,
		cache_hit=is_cache_hit,
		query_name=parameterized_query.query_name,
		triggered_refresh=triggered_refresh,
		**parameterized_query.supplied_filters_dict
	)

	return response


def _trigger_if_stale(parameterized_query, run_local=False):
	staleness = (datetime.utcnow() - parameterized_query.result_as_of).total_seconds()
	query_fetch_metric_fields = {
		"count": 1,
		"staleness": int(staleness)
	}
	query_fetch_metric_fields.update(
		parameterized_query.supplied_non_filters_dict
	)

	influx.influx_metric(
		"redshift_response_payload_staleness",
		query_fetch_metric_fields,
		query_name=parameterized_query.query_name,
		**parameterized_query.supplied_filters_dict
	)

	if parameterized_query.result_is_stale or run_local:
		attempt_request_triggered_query_execution(parameterized_query, run_local)
		return True

	return False


def attempt_request_triggered_query_execution(parameterized_query, run_local=False):
	do_personal = settings.REDSHIFT_TRIGGER_PERSONALIZED_DATA_REFRESHES_FROM_QUERY_REQUESTS
	if run_local or settings.REDSHIFT_TRIGGER_CACHE_REFRESHES_FROM_QUERY_REQUESTS:
		execute_query(parameterized_query, run_local)
	elif do_personal and parameterized_query.is_personalized:
		execute_query(parameterized_query, run_local)
	else:
		log.debug("Triggering query from web app is disabled")


@method_decorator(view_requires_feature_access("archetype-training"), name="dispatch")
class ClusteringChartsView(LoginRequiredMixin, RequestMetaMixin, TemplateView):
	template_name = "archetypes/clustering_charts.html"
	title = "Clustering Charts"


@method_decorator(view_requires_feature_access("archetype-training"), name="dispatch")
def clustering_data(request, num_clusters=5):
	from sklearn.cluster import KMeans
	from sklearn.preprocessing import StandardScaler
	from sklearn.decomposition import PCA

	query = get_redshift_query("list_deck_clustering_data")
	parameterized_query = query.build_full_params(dict(
		TimeRange="LAST_3_DAYS",
		GameType="RANKED_STANDARD",
	))
	data = parameterized_query.response_payload

	for player_class, decks in data["decks"].items():
		X = [deck["vector"] for deck in decks]
		xy = PCA(n_components=2).fit_transform(deepcopy(X))
		for (x, y), deck in zip(xy, decks):
			deck["x"] = float(x)
			deck["y"] = float(y)

		X = StandardScaler().fit_transform(X)
		clusterizer = KMeans(n_clusters=min(int(num_clusters), len(X)))
		clusterizer.fit(X)
		for deck, cluster_id in zip(decks, clusterizer.labels_):
			deck["cluster_id"] = int(cluster_id)
			del deck["vector"]

	result = []
	for player_class_id, decks in data["decks"].items():
		player_class_result = {
			"player_class": enums.CardClass(int(player_class_id)).name,
			"data": []
		}
		for deck in decks:
			metadata = {
				"games": int(deck["num_games"]),
				"archetype_name": str(deck["cluster_id"]),
				"archetype": deck["cluster_id"],
				"url": deck["url"],
				"shortid": deck["shortid"]
			}
			player_class_result["data"].append({
				"x": deck["x"],
				"y": deck["y"],
				"metadata": metadata
			})
		result.append(player_class_result)

	response = HttpResponse(
		content=json.dumps(result, indent=4),
		content_type="application/json"
	)
	return response
