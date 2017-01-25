import json
from django.urls import reverse
from django.http import Http404
from django.http import HttpResponseForbidden
from datetime import date
from hsredshift.analytics import queries
from django.http import HttpResponse
from hsredshift.analytics import filters
from hsreplaynet.utils.influx import influx_metric
from hsreplaynet.utils.influx import get_redshift_query_average_duration_seconds
from .processing import execute_query, get_from_redshift_cache


def fetch_report_results(request, name):
	query = queries.get_report(name)
	if not query:
		raise Http404("No query named: %s" % name)

	# Unlike queries, reports don't accept filter parameters
	params = query.get_report_params()

	return _fetch_query_results(query, params)


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
	was_cache_hit = False
	triggered_refresh = False
	if cached_data:
		was_cache_hit = True
		if cached_data.cached_params.are_stale(params):
			triggered_refresh = True
			# Execute the query to refresh the stale data asynchronously
			# And then return the data we have available immediately
			execute_query(query, params, async=True)
	else:
		# Nothing to return so user will have to wait while we generate it
		cached_data = execute_query(query, params, async=False)

	influx_metric(
		"redshift_query_fetch",
		{"count": 1},
		cache_hit=was_cache_hit,
		query=query.name,
		triggered_refresh=triggered_refresh
	)

	payload_str = json.dumps(cached_data.response_payload, indent=4, sort_keys=True)
	return HttpResponse(payload_str, content_type="application/json")


def user_is_eligible_for_query(user, params):
	if params.has_premium_values:
		return (not user.is_anonymous) and (user.is_premium)
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

	payload_str = json.dumps(result, indent=4, sort_keys=True)
	return HttpResponse(payload_str, content_type="application/json")


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

	payload_str = json.dumps(result, indent=4, sort_keys=True)
	return HttpResponse(payload_str, content_type="application/json")
