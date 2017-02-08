import json
from django.core.cache import caches
from django.conf import settings
from sqlalchemy import create_engine
from hsreplaynet.utils.influx import influx_timer
from hsreplaynet.utils.aws.clients import LAMBDA
from hsreplaynet.utils import log
from hsredshift.analytics.library.base import RedshiftQueryParams
import redis_lock


class CachedRedshiftResult(object):

	def __init__(self, response_payload, params):
		self.response_payload = response_payload
		self.cached_params = params

	def to_json_cacheable_repr(self):
		return {
			"response_payload": self.response_payload,
			"cached_params": self.cached_params.to_json_cacheable_repr()
		}

	@classmethod
	def from_json_cacheable_repr(cls, repr):
		return CachedRedshiftResult(
			repr["response_payload"],
			RedshiftQueryParams.from_json_cacheable_repr(repr["cached_params"])
		)


def execute_query(query, params, async=False):
	if async:
		_execute_query_async(query, params)
	else:
		return _execute_query_sync(query, params)


def _lock_exists(cache_key):
	lock_signal_key = "lock:%s" % cache_key
	lock_signal = get_redshift_cache().get(lock_signal_key)
	return lock_signal is not None


def _execute_query_async(query, params):
	# It's safe to launch multiple attempts to execute for the same query
	# Because the dogpile lock will only allow one to execute
	# But we can save resources by not even launching the attempt
	# If we see that the lock already exists
	if not _lock_exists(params.cache_key):
		log.info("No lock already exists for query. Will attempt to execute async.")

		if settings.ENV_AWS and settings.PROCESS_REDSHIFT_QUERIES_VIA_LAMBDA:
			# In PROD use Lambdas so the web-servers don't get overloaded
			LAMBDA.invoke(
				FunctionName="execute_redshift_query",
				InvocationType="Event",  # Triggers asynchronous invocation
				Payload=_to_lambda_payload(query, params),
			)
		else:
			from hsreplaynet.utils.redis import job_queue
			job_queue.enqueue(_do_execute_query, query, params)
	else:
		msg = "An async attempt to run this query is in-flight. Will not launch another."
		log.info(msg)


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
	# This method should always be getting executed within a Lambda context
	engine = get_redshift_engine()

	# Distributed dog pile lock pattern
	# From: https://pypi.python.org/pypi/python-redis-lock
	log.info("About to attempt acquiring lock...")
	redis_client = get_redshift_cache().client.get_client()

	with redis_lock.Lock(redis_client, params.cache_key, expire=60, auto_renewal=True):
		# Get a lock with a 60-second lifetime but keep renewing it automatically
		# to ensure the lock is held for as long as the Python process / Lambda is running.
		log.info("Lock acquired.")

		# When we enter this block it's either because we were blocking
		# and now the value is available,
		# or it's because we're going to do the work
		cached_data = get_from_redshift_cache(params.cache_key)
		if cached_data and not cached_data.cached_params.are_stale(params):
			log.info("Up-to-date cached data exists. Exiting without running query.")
			return cached_data
		else:
			log.info("Cached data missing or stale. Executing query now.")
			# DO EXPENSIVE WORK
			with influx_timer("redshift_query_duration", query=query.name):
				results = query.as_result_set().execute(engine, params)

			response_payload = query.to_response_payload(results, params)
			cached_data = CachedRedshiftResult(response_payload, params)

			get_redshift_cache().set(
				params.cache_key,
				cached_data.to_json_cacheable_repr(),
				timeout=None
			)

			log.info("Query finished and results have been stored in the cache.")
			return cached_data


def evict_from_cache(cache_key):
	get_redshift_cache().delete(cache_key)


def get_redshift_cache():
	return caches['redshift']


def get_redshift_engine():
		return create_engine(settings.REDSHIFT_CONNECTION)


def get_from_redshift_cache(cache_key):
	try:
		cached_repr = get_redshift_cache().get(cache_key)
		if cached_repr:
			return CachedRedshiftResult.from_json_cacheable_repr(cached_repr)
		else:
			return None
	except AttributeError as e:
		# If the cache was invalidated or corrupted just return None
		# It will be handled like a Cache Miss
		log.exception(e)
		return None
