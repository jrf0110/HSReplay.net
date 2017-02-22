from datetime import date
from django.contrib.admin.views.decorators import staff_member_required
from django.http import Http404, HttpResponseForbidden, JsonResponse
from django.urls import reverse
from hsredshift.analytics import queries
from hsredshift.analytics import filters
from hsreplaynet.utils import log
from hsreplaynet.utils.influx import influx_metric
from hsreplaynet.utils.influx import get_redshift_query_average_duration_seconds
from .processing import execute_query, get_from_redshift_cache, evict_from_cache


@staff_member_required
def evict_query_from_cache(request, name):
	query = queries.get_query(name)
	if not query:
		raise Http404("No query named: %s" % name)

	params = query.build_full_params(request.GET)
	evict_from_cache(params.cache_key)
	return JsonResponse({"msg": "OK"})


def fetch_query_results(request, name):
	query = queries.get_query(name)
	if not query:
		raise Http404("No query named: %s" % name)

	params = query.build_full_params(request.GET)
	if not user_is_eligible_for_query(request.user, params):
		return HttpResponseForbidden()

	return _fetch_query_results(query, params)


def _fetch_query_results(query, params):
	cached_data = get_from_redshift_cache(params.cache_key)
	triggered_refresh = False
	num_seconds = 0
	if cached_data:
		is_stale, num_seconds = cached_data.cached_params.are_stale(params)
		if is_stale:
			triggered_refresh = True
			# Execute the query to refresh the stale data asynchronously
			# And then return the data we have available immediately
			execute_query(query, params, async=True)
		result = cached_data.response_payload
		response = JsonResponse(result)
	else:
		execute_query(query, params, async=True)
		# Nothing to return so tell the client to check back later
		result = {"msg": "Query is processing. Check back later."}
		response = JsonResponse(result, status=202)

	was_cache_hit = str(bool(cached_data))
	log.info("Query: %s Cache Hit: %s" % (query.name, was_cache_hit))
	query_fetch_metric_fields = {
		"count": 1,
		"seconds_stale": float(num_seconds)
	}
	query_fetch_metric_fields.update(
		params.supplied_non_filters_dict
	)

	influx_metric(
		"redshift_query_fetch",
		query_fetch_metric_fields,
		cache_hit=was_cache_hit,
		query_name=query.name,
		triggered_refresh=triggered_refresh,
		**params.supplied_filters_dict
	)

	return response


def user_is_eligible_for_query(user, params):
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
		query_duration_millis = get_redshift_query_average_duration_seconds(query.name)
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
