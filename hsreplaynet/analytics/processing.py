import copy
import json
import time
from datetime import datetime
from django.conf import settings
from django.core.cache import caches
from django.dispatch import receiver
from django.utils import timezone
from djstripe import signals
from redis_lock import Lock as RedisLock
from redis_semaphore import Semaphore
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from hsredshift.analytics.library.base import RedshiftQueryParams
from hsredshift.analytics.queries import RedshiftCatalogue
from hsreplaynet.utils import log
from hsreplaynet.utils.aws.clients import LAMBDA
from hsreplaynet.utils.aws.sqs import write_messages_to_queue
from hsreplaynet.utils.influx import influx_metric


class CachedRedshiftResult(object):

	def __init__(self, result_set, params, is_json=False, as_of=None):
		self.result_set = result_set
		self.cached_params = params
		self.is_json = is_json
		if as_of:
			self.as_of = time.mktime(as_of.timetuple())
		else:
			self.as_of = None

	def to_json_cacheable_repr(self):
		return {
			"result_set": self.result_set,
			"as_of": self.as_of,
			"is_json": self.is_json,
			"cached_params": self.cached_params.to_json_cacheable_repr()
		}

	@classmethod
	def from_json_cacheable_repr(cls, r):
		if "result_set" in r:
			result_data = r["result_set"]
		else:
			result_data = r["response_payload"]

		params = RedshiftQueryParams.from_json_cacheable_repr(r["cached_params"])

		is_json = r.get("is_json", False)

		if "as_of" in r and r["as_of"]:
			as_of = cls.ts_to_datetime(r["as_of"])
		else:
			as_of = None

		return CachedRedshiftResult(
			result_data,
			params,
			is_json,
			as_of
		)

	@classmethod
	def ts_to_datetime(self, ts):
		return datetime.fromtimestamp(ts, tz=timezone.get_current_timezone())

	@property
	def as_of_datetime(self):
		if self.as_of:
			return self.ts_to_datetime(self.as_of)
		else:
			return None


def enqueue_query(query, params):
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


def execute_query(query, params):
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


def _do_execute_query(query, params, wlm_queue=None):
	# This method should always be getting executed within a Lambda context

	# Distributed dog pile lock pattern
	# From: https://pypi.python.org/pypi/python-redis-lock
	log.info("About to attempt acquiring lock...")
	redis_client = get_redshift_cache_redis_client()

	with RedisLock(redis_client, params.cache_key, expire=300):
		# Get a lock with a 5-minute lifetime since that's the maximum duration of a Lambda
		# to ensure the lock is held for as long as the Python process / Lambda is running.
		log.info("Lock acquired.")

		# When we enter this block it's either because we were blocking
		# and now the value is available,
		# or it's because we're going to do the work
		cached_data = get_from_redshift_cache(params.cache_key)
		if cached_data and not cached_data.cached_params.are_stale(params)[0]:
			log.info("Up-to-date cached data exists. Exiting without running query.")
			return cached_data
		else:
			log.info("Cached data missing or stale. Executing query now.")
			# DO EXPENSIVE WORK

			start_ts = time.time()
			exception_raised = False
			exception_msg = None
			redshift_connection = get_new_redshift_connection()
			result_set = ''
			cached_data_as_of = timezone.now()
			try:
				result_set = query.as_result_set().execute(
					redshift_connection,
					params,
					wlm_queue,
					as_json=True,
					pretty=False
				)

				cache_ready_result = CachedRedshiftResult(
					result_set,
					params,
					is_json=True,
					as_of=cached_data_as_of
				)

				cache_data = cache_ready_result.to_json_cacheable_repr()
			except Exception as e:
				exception_raised = True
				exception_msg = str(e)
				raise
			finally:
				end_ts = time.time()
				duration_seconds = round(end_ts - start_ts, 2)
				redshift_connection.close()
				cache_data_size = len(result_set)

				query_execute_metric_fields = {
					"duration_seconds": duration_seconds,
					"cache_data_size": cache_data_size,
					"exception_message": exception_msg
				}
				query_execute_metric_fields.update(
					params.supplied_non_filters_dict
				)

				influx_metric(
					"redshift_query_execute",
					query_execute_metric_fields,
					exception_thrown=exception_raised,
					query_name=query.name,
					**params.supplied_filters_dict
				)

			get_redshift_cache().set(
				params.cache_key,
				cache_data,
				timeout=None
			)

			get_redshift_cache().set(
				params.cache_key_as_of,
				cache_ready_result.as_of,
				timeout=None
			)

			log.info("Query finished and results have been stored in the cache.")
			return cached_data


def evict_from_cache(params):
	get_redshift_cache().delete(params.cache_key)
	get_redshift_cache().delete(params.cache_key_as_of)
	# Also attempt to evict any lingering locks
	redis_client = get_redshift_cache_redis_client()
	lock_signal_key = _get_lock_signal_key(params.cache_key)
	redis_client.delete(lock_signal_key)


def _get_lock_signal_key(cache_key):
	return "lock:%s" % cache_key


def _lock_exists(cache_key):
	lock_signal_key = _get_lock_signal_key(cache_key)
	redis_client = get_redshift_cache_redis_client()
	lock_signal = redis_client.get(lock_signal_key)
	return lock_signal is not None


def get_redshift_cache():
	return caches['redshift']


def get_redshift_cache_redis_client():
	return get_redshift_cache().client.get_client()


def get_redshift_engine():
		return create_engine(settings.REDSHIFT_CONNECTION, poolclass=NullPool)


def get_new_redshift_connection(autocommit=True):
	conn = get_redshift_engine().connect()
	if autocommit:
		conn.execution_options(isolation_level="AUTOCOMMIT")
	return conn


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


@receiver(signals.WEBHOOK_SIGNALS["customer.subscription.created"])
def on_premium_purchased(sender, event, **kwargs):
	if event.customer and event.customer.subscriber:
		warm_redshift_cache_for_user(event.customer.subscriber)


def warm_redshift_cache_for_user(user):
	# This should be called whenever a user becomes premium
	pegasus_accounts = list(user.pegasusaccount_set.all())
	fill_personalized_query_queue(pegasus_accounts)


def fill_redshift_cache_warming_queue(eligible_queries=None):
	fill_global_query_queue(eligible_queries)
	pegasus_accounts = get_premium_pegasus_accounts()
	fill_personalized_query_queue(pegasus_accounts, eligible_queries)


def fill_global_query_queue(eligible_queries=None):
	queue_name = settings.REDSHIFT_ANALYTICS_QUERY_QUEUE_NAME
	messages = get_global_queries_for_cache_warming(eligible_queries)
	stales_queries = filter_freshly_cached_queries(messages)
	write_messages_to_queue(queue_name, stales_queries)


def fill_personalized_query_queue(pegasus_accounts, eligible_queries=None):
	queue_name = settings.REDSHIFT_PERSONALIZED_QUERY_QUEUE_NAME
	messages = get_personalized_queries_for_cache_warming(
		pegasus_accounts,
		eligible_queries
	)
	stales_queries = filter_freshly_cached_queries(messages)
	write_messages_to_queue(queue_name, stales_queries)


def get_premium_pegasus_accounts():
	result = []
	from djstripe.models import Subscription
	for subscription in Subscription.objects.active():
		user = subscription.customer.subscriber
		result.extend(list(user.pegasusaccount_set.all()))
	return result


def get_personalized_queries_for_cache_warming(pegasus_accounts, eligible_queries=None):
	queries = []
	for query in RedshiftCatalogue.instance().personalized_queries:
		if eligible_queries is None or query.name in eligible_queries:
			for permutation in query.generate_personalized_parameter_permutation_bases():
				# Each permutation will still be missing a Region and account_lo value
				for pegasus_account in pegasus_accounts:
					new_permutation = copy.copy(permutation)
					new_permutation["Region"] = pegasus_account.region.name
					new_permutation["account_lo"] = pegasus_account.account_lo
					queries.append({
						"query_name": query.name,
						"supplied_parameters": new_permutation
					})
	return queries


def filter_freshly_cached_queries(messages):
	if not settings.ENV_AWS:
		# We can only reach the cache from inside AWS
		# So we cannot take advantage of this optimization outside AWS
		# Skipping filtering is okay as up-to-date queries will still
		# get skipped at query execution time
		return messages

	result = []
	for msg in messages:
		query = RedshiftCatalogue.instance().get_query(msg["query_name"])
		params = query.build_full_params(msg["supplied_parameters"])

		cached_data = get_from_redshift_cache(params.cache_key)
		if cached_data:
			if cached_data.cached_params.are_stale(params)[0]:
				# Keep this message because the cache is stale
				result.append(msg)
		else:
			# Keep this msg because nothing exists in cache
			result.append(msg)

	return result


def get_global_queries_for_cache_warming(eligible_queries=None):
	queries = []
	for query in RedshiftCatalogue.instance().global_queries:
		if eligible_queries is None or query.name in eligible_queries:
			for permutation in query.generate_cachable_parameter_permutations():
				queries.append({
					"query_name": query.name,
					"supplied_parameters": permutation
				})
	return queries


def get_concurrent_redshift_query_queue_semaphore(queue_name):
	concurrency = settings.REDSHIFT_QUERY_QUEUES[queue_name]["concurrency"]
	concurrent_redshift_query_semaphore = Semaphore(
		get_redshift_cache_redis_client(),
		count=concurrency,
		namespace=queue_name,
		stale_client_timeout=300,
		blocking=False
	)
	return concurrent_redshift_query_semaphore
