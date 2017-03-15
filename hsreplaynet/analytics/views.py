from datetime import date
from django.contrib.admin.views.decorators import staff_member_required
from django.http import Http404, HttpResponseForbidden, JsonResponse
from django.urls import reverse
from django.views.decorators.http import condition
from hsredshift.analytics import filters, queries
from hsredshift.analytics.filters import Region
from hsreplaynet.features.decorators import view_requires_feature_access
from hsreplaynet.utils import influx, log
from .processing import (
	CachedRedshiftResult, evict_from_cache, execute_query,
	get_concurrent_redshift_query_queue_semaphore, get_from_redshift_cache, get_redshift_cache
)


@staff_member_required
def evict_query_from_cache(request, name):
	query = queries.get_query(name)
	if not query:
		raise Http404("No query named: %s" % name)

	params = query.build_full_params(request.GET)
	evict_from_cache(params)
	return JsonResponse({"msg": "OK"})


@staff_member_required
def release_semaphore(request, name):
	semaphore = get_concurrent_redshift_query_queue_semaphore(name)
	if semaphore:
		semaphore.reset()
	return JsonResponse({"msg": "OK"})


def fetch_query_result_as_of(request, name):
	query, params = _get_query_and_params(request, name)
	as_of_ts = get_redshift_cache().get(params.cache_key_as_of)
	if as_of_ts:
		return CachedRedshiftResult.ts_to_datetime(as_of_ts)
	else:
		return None


def _get_query_and_params(request, name):
	query = queries.get_query(name)
	if not query:
		raise Http404("No query named: %s" % name)

	if query.is_personalized:
		if request.user and not request.user.is_fake:
			supplied_params = request.GET.dict()

			if "Region" not in supplied_params:
				default_pegasus_account = request.user.pegasusaccount_set.first()

				if default_pegasus_account:
					supplied_params["Region"] = default_pegasus_account.region.name
					supplied_params["account_lo"] = default_pegasus_account.account_lo
				else:
					raise Http404("User does not have any Pegasus Accounts.")
			else:
				user_owns_pegasus_account = request.user.pegasusaccount_set.filter(
					region__exact=int(supplied_params["Region"]),
					account_lo__exact=int(supplied_params["account_lo"])
				).exists()
				if not user_owns_pegasus_account:
					return HttpResponseForbidden()

			if supplied_params["Region"].isdigit():
				region_member = Region.from_int(int(supplied_params["Region"]))
				supplied_params["Region"] = region_member.name

			personal_params = query.build_full_params(supplied_params)

			if not user_is_eligible_for_query(request.user, query, personal_params):
				return HttpResponseForbidden()

			return query, personal_params

		else:
			# Anonymous or Fake Users Can Never Request Personal Stats
			return HttpResponseForbidden()
	else:

		params = query.build_full_params(request.GET)
		if not user_is_eligible_for_query(request.user, query, params):
			return HttpResponseForbidden()

		return query, params


@view_requires_feature_access("carddb")
@condition(last_modified_func=fetch_query_result_as_of)
def fetch_query_results(request, name):
	query, params = _get_query_and_params(request, name)
	return _fetch_query_results(query, params)


@view_requires_feature_access("carddb")
@condition(last_modified_func=fetch_query_result_as_of)
def fetch_local_query_results(request, name):
	# This end point is intended only for administrator use.
	# It provides an entry point to force a query to be run locally
	# and by-pass all of the in-flight short circuits.
	# This can be critical in case a query is failing on Lambda, and
	# repeated attempts to run it on lambda are causing it's in-flight status
	# to always be true.
	query, params = _get_query_and_params(request, name)
	return _fetch_query_results(query, params, run_local=True)


def _attempt_fetch_query_response_payload(query, params, run_local=False):
	log.info("Fetching data for query: %s" % query.name)
	log.info("Query params are: %s" % params.cache_key)

	cached_data = get_from_redshift_cache(params.cache_key)
	triggered_refresh = False
	num_seconds = 0
	response_payload = None
	if cached_data:
		log.info("A record was found in the cache")
		is_stale, num_seconds = cached_data.cached_params.are_stale(params)
		if is_stale:
			log.info("The cached data is stale.")
			if not query.global_query:
				log.info("The requested query is not a global query.")
				log.info("Scheduling data refresh and returning stale data.")
				triggered_refresh = True
				# Execute the query to refresh the stale data asynchronously
				# And then return the data we have available immediately
				execute_query(query, params, run_local)
				response_payload = cached_data.to_response_payload()
			else:
				# This is a global query, so either:
				# 1) We have up-to-date global data,
				# in which case we can just update the specific data and serve it.
				# 2) Or we have stale global data,
				# in which case we have to schedule a refresh of the global data.
				log.info("The requested query is a global query.")
				if cached_data.has_fresh_global_data(params):
					log.info("The cached data is stale, but there is fresh global data")
					log.info("We will refresh the cached data using the fresh global data")
					# We are in scenario #1
					# to_response_payload() will ensure that fresh specific data
					# is generated from the global data.
					response_payload = cached_data.to_response_payload(
						refresh_from_global=True
					)
				else:
					log.info("The cached data is stale, and so is the global data")
					log.info("We will return stale data and schedule a refresh.")
					# We are in scenario #2
					triggered_refresh = True
					# Execute the query to refresh the stale data asynchronously
					# And then return the stale data we have available immediately
					execute_query(query, params, run_local)
					response_payload = cached_data.to_response_payload()
		else:
			# The cached data is fresh, so we can serve that.
			response_payload = cached_data.to_response_payload()
	else:
		log.info("There is nothing in the cache.")

		if query.global_query:
			log.info("Will check for global data.")

			cached_global_data = get_from_redshift_cache(params.global_cache_key)
			if cached_global_data:
				log.info("Will create a cache record from global data")
				cached_data = cached_global_data.create_from_global_data(params)
				response_payload = cached_data.to_response_payload()
			else:
				log.info("No global data in cache. Will return 202.")
				# We have nothing stored in the cache
				# So we schedule the query and we return None
				# Which will cause the client to be told to check back later
				execute_query(query, params, run_local)
				response_payload = None

		else:
			log.info("Requested query is not global. Will return 202")
			execute_query(query, params, run_local)
			response_payload = None

	was_cache_hit = str(bool(cached_data))
	log.info("Query: %s Cache Hit: %s" % (query.name, was_cache_hit))
	query_fetch_metric_fields = {
		"count": 1,
		"seconds_stale": float(num_seconds)
	}
	query_fetch_metric_fields.update(
		params.supplied_non_filters_dict
	)

	influx.influx_metric(
		"redshift_query_fetch",
		query_fetch_metric_fields,
		cache_hit=was_cache_hit,
		query_name=query.name,
		triggered_refresh=triggered_refresh,
		**params.supplied_filters_dict
	)

	return response_payload


def _fetch_query_results(query, params, run_local=False):
	response_payload = _attempt_fetch_query_response_payload(
		query,
		params,
		run_local
	)

	if response_payload:
		response = JsonResponse(response_payload, json_dumps_params=dict(indent=4))
	else:
		result = {"msg": "Query is processing. Check back later."}
		response = JsonResponse(result, status=202)

	return response


def user_is_eligible_for_query(user, query, params):
	if user.is_staff:
		return True

	if params.has_premium_values:
		return user.is_authenticated and user.is_premium
	else:
		return True


def card_inventory(request, card_id):
	result = []
	for query in queries.card_inventory(card_id):
		inventory_entry = {
			"endpoint": reverse("analytics_fetch_query_results", kwargs={"name": query.name}),
			"params": query.required_parameters
		}
		query_duration_millis = influx.get_redshift_query_average_duration_seconds(query.name)
		if query_duration_millis:
			inventory_entry["avg_query_duration_seconds"] = query_duration_millis

		result.append(inventory_entry)

	return JsonResponse(result)


def get_filters(request):
	result = {
		"server_date": str(date.today()),
		"filters": [
			{
				"name": "TimeRange",
				"elements": filters.TimeRange.to_json_serializable()
			},
			{
				"name": "RankRange",
				"elements": filters.RankRange.to_json_serializable()
			},
			{
				"name": "PlayerClass",
				"elements": filters.PlayerClass.to_json_serializable()
			},
			{
				"name": "Region",
				"elements": filters.Region.to_json_serializable()
			},
			{
				"name": "GameType",
				"elements": filters.GameType.to_json_serializable()
			}
		]
	}

	return JsonResponse(result)
