import json
from django.core.cache import caches
from django.conf import settings
from sqlalchemy import create_engine
from hsreplaynet.utils.influx import influx_timer
from hsreplaynet.utils.aws.clients import LAMBDA
from hsreplaynet.utils import log


class CachedRedshiftResult(object):

	def __init__(self, response_payload, params):
		self.response_payload = response_payload
		self.cached_params = params


def execute_query(query, params, async=False):
	if async:
		_execute_query_async(query, params)
	else:
		return _execute_query_sync(query, params)


def _execute_query_async(query, params):
	if settings.ENV_AWS and settings.PROCESS_REDSHIFT_QUERIES_VIA_LAMBDA:
		# In PROD use Lambdas so the web-servers don't get overloaded
		# NOTE: Lambdas cannot reach the cache until the VPCAccess
		# configuration issues are resolved.
		LAMBDA.invoke(
			FunctionName="execute_redshift_query",
			InvocationType="Event",  # Triggers asynchronous invocation
			Payload=_to_lambda_payload(query, params),
		)
	else:
		from hsreplaynet.utils.redis import job_queue
		job_queue.enqueue(_do_execute_query, query, params)


def _to_lambda_payload(query, params):
	payload = {
		"query_name": query.name,
		"supplied_parameters": params.supplied_parameters
	}

	return json.dumps(payload)


def _execute_query_sync(query, params):
	if settings.ENV_AWS and settings.PROCESS_REDSHIFT_QUERIES_VIA_LAMBDA:
		# In PROD use Lambdas so the web-servers don't get overloaded
		# NOTE: Lambdas cannot reach the cache until the VPCAccess
		# configuration issues are resolved.
		LAMBDA.invoke(
			FunctionName="execute_redshift_query",
			InvocationType="RequestResponse",  # Triggers synchronous invocation
			Payload=_to_lambda_payload(query, params),
		)
		# Once this returns we can expect the result to be in the cache
		return get_from_redshift_cache(params.cache_key)
	else:
		return _do_execute_query(query, params)


def _do_execute_query(query, params):
	engine = get_redshift_engine()

	# Distributed dog pile lock pattern
	# From: https://pypi.python.org/pypi/python-redis-lock
	# with get_redshift_cache().lock(params.cache_key):

	# When we enter this block it's either because we were blocking
	# and now the value is available,
	# or it's because we're going to do the work
	cached_data = get_from_redshift_cache(params.cache_key)
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


def evict_from_cache(cache_key):
	get_redshift_cache().delete(cache_key)


def get_redshift_cache():
	return caches['redshift']


def get_redshift_engine():
		return create_engine(settings.REDSHIFT_CONNECTION)


def get_from_redshift_cache(cache_key):
	try:
		return get_redshift_cache().get(cache_key)
	except AttributeError as e:
		# If the cache was invalidated or corrupted just return None
		# It will be handled like a Cache Miss
		log.exception(e)
		return None
