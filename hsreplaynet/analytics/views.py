import json
import hashlib
from django.core.cache import cache
from django.urls import reverse
from django.conf import settings
from django.http import Http404
from django.http import HttpResponseForbidden
from datetime import date, datetime
from hsredshift.analytics import queries
from hsreplaynet.cards.models import Card
from django.http import HttpResponse
from sqlalchemy import create_engine
from hsredshift.analytics import filters


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
	if cached_data:
		if cached_data.cached_params.are_stale(params):
			from hsreplaynet.utils.redis import job_queue
			# The cache will be updated with the new results within execute_query
			job_queue.enqueue(execute_query, query, params)
	else:
		# Nothing to return so user will have to wait while we generate it
		cached_data = execute_query(query, params)

	payload_str = json.dumps(cached_data.response_payload, indent=4, sort_keys=True)
	return HttpResponse(payload_str, content_type="application/json")


def execute_query(query, params):
	engine = get_redshift_engine()

	results = query.as_result_set().execute(engine, params)
	response_payload = query.to_response_payload(results, params)
	cached_data = CachedRedshiftResult(response_payload, params)

	get_redshift_cache().set(params.cache_key, cached_data, timeout=None)
	return cached_data


def user_is_eligible_for_query(user, params):
	if params.has_premium_values:
		return user.is_premium
	else:
		return True


def get_redshift_cache():
	return cache


def get_redshift_engine():
		return create_engine(settings.REDSHIFT_CONNECTION)


def card_inventory(request, card_id):
	result = []
	card = Card.objects.get(id=card_id)
	for query in queries.card_inventory(card):
		query = {
			"endpoint": reverse("analytics_fetch_query_results", kwargs={"name": query.name}),
			"params": query.params()
		}
		result.append(query)

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


# ****** Legacy Code ****** #

def to_cache_key(query_name, params):
	m = hashlib.md5()
	m.update(query_name.encode("utf8"))
	for k, v in params.items():
		cache_key_component = "%s:%s" % (k, v)
		m.update(cache_key_component.encode("utf8"))

	return m.hexdigest()


def run_query(request, name):
	conn_info = settings.REDSHIFT_CONNECTION
	engine = create_engine(conn_info)
	query = queries.get_query(name)
	params = {}
	for param_name, converter in query.params().items():
		if param_name in request.GET:
			if converter == date:
				params[param_name] = datetime.strptime(request.GET[param_name], '%Y-%m-%d').date()
			else:
				params[param_name] = converter(request.GET[param_name])

	results = query.as_result_set().execute(engine, params)

	chart_series_data = query.to_chart_series(params, results)

	result = {
		"render_as": query.display_visual.name.lower(),
		"label_x": query.label_x,
		"label_y": query.label_y,
		"domain_y": query.get_y_domain(params, results),
		"title": query.title,
		"series": chart_series_data
	}

	payload_str = json.dumps(result, indent=4, sort_keys=True)
	return HttpResponse(payload_str, content_type="application/json")
