import json
from django.core.cache import caches
from django.urls import reverse
from django.conf import settings
from django.http import Http404
from django.http import HttpResponseForbidden
from datetime import date
from hsredshift.analytics import queries
from hsreplaynet.cards.models import Card
from django.http import HttpResponse
from sqlalchemy import create_engine
from hsredshift.analytics import filters
from hsreplaynet.utils.influx import influx_metric, influx_timer
from hsreplaynet.utils.influx import get_redshift_query_average_duration_seconds


class CachedRedshiftResult(object):

	def __init__(self, response_payload, params):
		self.response_payload = response_payload
		self.cached_params = params


def fetch_query_results(request, name):
	query = queries.get_query(name)
	if not query:
		raise Http404("No query named: %s" % name)

	params = query.build_full_params(request.GET)
	if not user_is_eligible_for_query(request.user, params):
		return HttpResponseForbidden()

	cached_data = get_redshift_cache().get(params.cache_key)
	was_cache_hit = False
	triggered_refresh = False
	if cached_data:
		was_cache_hit = True
		if cached_data.cached_params.are_stale(params):
			triggered_refresh = True
			from hsreplaynet.utils.redis import job_queue
			# The cache will be updated with the new results within execute_query
			job_queue.enqueue(execute_query, query, params)
	else:
		# Nothing to return so user will have to wait while we generate it
		cached_data = execute_query(query, params)

	influx_metric(
		"redshift_query_fetch",
		{"count": 1},
		cache_hit=was_cache_hit,
		query=name,
		triggered_refresh=triggered_refresh
	)

	payload_str = json.dumps(cached_data.response_payload, indent=4, sort_keys=True)
	return HttpResponse(payload_str, content_type="application/json")


def execute_query(query, params):
	engine = get_redshift_engine()

	# Distributed dog pile lock pattern
	# From: https://pypi.python.org/pypi/python-redis-lock
	with get_redshift_cache().lock(params.cache_key):
		# When we enter this block it's either because we were blocking
		# and now the value is available,
		# or it's because we're going to do the work
		cached_data = get_redshift_cache().get(params.cache_key)
		if cached_data:
			return cached_data
		else:
			# DO EXPENSIVE WORK
			with influx_timer("redshift_query_duration", query=query.name):
				results = query.as_result_set().execute(engine, params)

			response_payload = query.to_response_payload(results, params)
			cached_data = CachedRedshiftResult(response_payload, params)

			get_redshift_cache().set(params.cache_key, cached_data, timeout=None)
			return cached_data


def user_is_eligible_for_query(user, params):
	if params.has_premium_values:
		return (not user.is_anonymous) and (user.is_premium)
	else:
		return True


def get_redshift_cache():
	return caches['redshift']


def get_redshift_engine():
		return create_engine(settings.REDSHIFT_CONNECTION)


def card_inventory(request, card_id):
	result = []
	card = Card.objects.get(id=card_id)
	for query in queries.card_inventory(card):
		inventory_entry = {
			"endpoint": reverse("analytics_fetch_query_results", kwargs={"name": query.name}),
			"params": query.params()
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
