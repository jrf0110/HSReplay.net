import copy
import json
import time
from collections import defaultdict
from datetime import datetime, timedelta
from django.conf import settings
from django.core.cache import caches
from django.core.serializers.json import DjangoJSONEncoder
from django.utils import timezone
from hearthstone.enums import BnetGameType
from redis_lock import Lock as RedisLock
from redis_semaphore import Semaphore
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from hsredshift.analytics import queries
from hsredshift.analytics.library.base import RedshiftQueryParams
from hsredshift.analytics.queries import RedshiftCatalogue
from hsreplaynet.utils import influx, log
from hsreplaynet.utils.aws.clients import LAMBDA
from hsreplaynet.utils.aws.sqs import write_messages_to_queue
from hsreplaynet.utils.influx import influx_metric


class CachedRedshiftResult(object):
	def __init__(self, result_set, params, is_json=False, as_of=None, response_payload=None):
		self.result_set = result_set
		self.cached_params = params
		self.is_json = is_json
		if as_of:
			self.as_of = time.mktime(as_of.timetuple())
		else:
			self.as_of = None

		self.response_payload = response_payload
		self._global_cache_data = None

	def to_json_cacheable_repr(self):
		cacheable_repr = {
			"result_set": self.result_set,
			"response_payload": self.response_payload,
			"as_of": self.as_of,
			"is_json": self.is_json,
			"cached_params": self.cached_params.to_json_cacheable_repr()
		}
		return cacheable_repr

	@classmethod
	def from_json_cacheable_repr(cls, r):
		result_set = r["result_set"]
		response_payload = r.get("response_payload", None)

		params = RedshiftQueryParams.from_json_cacheable_repr(r["cached_params"])

		is_json = r.get("is_json", False)

		as_of = r.get("as_of") or None
		if as_of:
			as_of = cls.ts_to_datetime(as_of)

		return CachedRedshiftResult(
			result_set,
			params,
			is_json,
			as_of,
			response_payload
		)

	@classmethod
	def ts_to_datetime(self, ts):
		return datetime.fromtimestamp(ts, tz=timezone.get_current_timezone())

	@property
	def as_of_datetime(self):
		if self.as_of:
			return self.ts_to_datetime(self.as_of)

	@property
	def global_cache_data(self):
		if not self.cached_params._query.global_query:
			raise RuntimeError("Cannot access global data for non global query")

		if not self._global_cache_data:
			self._global_cache_data = get_from_redshift_cache(
				self.cached_params.global_cache_key
			)
		return self._global_cache_data

	def to_response_payload(self, refresh_from_global=False):
		msg = "response_payload requested. refresh_from_global=%s" % refresh_from_global
		log.info(msg)

		if not self.response_payload or refresh_from_global:
			log.info("Constructing response_payload")

			if self.cached_params._query.global_query:
				log.info("Using global query logic")
				# This block implements generating response_payloads
				# By using the global cached data.
				result_set = self.global_cache_data.result_set
				if self.is_json:
					result_set = json.loads(result_set)

				response_payload = self.cached_params._query.to_response_payload(
					result_set, self.cached_params
				)
				self.as_of = self.global_cache_data.as_of

			else:
				log.info("Using non global query logic")
				# This block does it for non global queries
				# For non global queries the result_set will be set on this
				# object, so we can use self.result_set directly
				result_set = self.result_set
				if self.is_json:
					result_set = json.loads(result_set)

				response_payload = self.cached_params._query.to_response_payload(
					result_set, self.cached_params
				)

			response_payload["as_of"] = self.as_of_datetime.isoformat()
			self.response_payload = response_payload

			# We must update the cache here now that we have a response payload
			get_redshift_cache().set(
				self.cached_params.cache_key,
				self.to_json_cacheable_repr(),
				timeout=None
			)

			get_redshift_cache().set(
				self.cached_params.cache_key_as_of,
				self.as_of,
				timeout=None
			)
		else:
			log.info("Using the response payload already available in the cache")

		staleness = (timezone.now() - self.as_of_datetime).total_seconds()
		query_fetch_metric_fields = {
			"count": 1,
			"staleness": int(staleness)
		}
		query_fetch_metric_fields.update(
			self.cached_params.supplied_non_filters_dict
		)

		influx.influx_metric(
			"redshift_response_payload_staleness",
			query_fetch_metric_fields,
			query_name=self.cached_params._query.name,
			**self.cached_params.supplied_filters_dict
		)
		return self.response_payload

	def create_from_global_data(self, params):
		result_set = self.result_set
		if self.is_json:
			result_set = json.loads(result_set)
		response_payload = self.cached_params._query.to_response_payload(
			result_set, params
		)
		response_payload["as_of"] = self.as_of_datetime.isoformat()

		cache_ready_result = CachedRedshiftResult(
			None,
			params,
			is_json=True,
			as_of=self.as_of_datetime,
			response_payload=response_payload
		)

		get_redshift_cache().set(
			params.cache_key,
			cache_ready_result.to_json_cacheable_repr(),
			timeout=None
		)

		get_redshift_cache().set(
			params.cache_key_as_of,
			cache_ready_result.as_of,
			timeout=None
		)
		return cache_ready_result

	def has_fresh_global_data(self, params):
		is_stale, num_seconds = self.global_cache_data.cached_params.are_stale(params)
		return not is_stale


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


def execute_query(query, params, run_local=False):
	if run_local:
		return _do_execute_query_work(query, params)

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
		return _do_execute_query_work(query, params, wlm_queue)


def _do_execute_query_work(query, params, wlm_queue=None):
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
		result_set = ""
		cached_data_as_of = timezone.now()
		try:
			result_set = query.as_result_set().execute(
				redshift_connection, params, wlm_queue,
			)
			result_set = json.dumps(result_set, cls=DjangoJSONEncoder)
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

		if query.global_query:
			# For global queries don't set the result set on the object directly
			# Because it can be large, we cache it separately so we don't have to
			# load it every time we access the object
			cache_ready_result = CachedRedshiftResult(
				None,
				params,
				is_json=True,
				as_of=cached_data_as_of
			)

			cache_ready_global_result = CachedRedshiftResult(
				result_set,
				params,
				is_json=True,
				as_of=cached_data_as_of
			)

			get_redshift_cache().set(
				params.global_cache_key,
				cache_ready_global_result.to_json_cacheable_repr(),
				timeout=None
			)

		else:
			cache_ready_result = CachedRedshiftResult(
				result_set,
				params,
				is_json=True,
				as_of=cached_data_as_of
			)

		get_redshift_cache().set(
			params.cache_key,
			cache_ready_result.to_json_cacheable_repr(),
			timeout=None
		)

		get_redshift_cache().set(
			params.cache_key_as_of,
			cache_ready_result.as_of,
			timeout=None
		)

		log.info("Query finished and results have been stored in the cache.")
		return cache_ready_result


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
	return caches["redshift"]


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


class PremiumUserCacheWarmingContext:

	def __init__(self, user, pegasus_accounts, decks):
		self.user = user
		self.pegasus_accounts = pegasus_accounts
		self.decks = decks

	@classmethod
	def from_user(cls, user):
		decks = defaultdict(set)
		from hsreplaynet.games.models import GameReplay
		time_horizon = timezone.now() - timedelta(days=30)
		qs = GameReplay.objects.live().filter(
			user=user,
			global_game__match_start__gte=time_horizon
		)

		for replay in qs.all():
			if replay.friendly_deck.size == 30:
				decks[replay.friendly_deck].add(replay.global_game.game_type)
		pegasus_accounts = list(user.pegasusaccount_set.all())
		result = PremiumUserCacheWarmingContext(
			user,
			pegasus_accounts,
			decks
		)
		return result


def warm_redshift_cache_for_user_context(context):
	# This should be called whenever a user becomes premium
	fill_personalized_query_queue([context])


def fill_redshift_cache_warming_queue(eligible_queries=None):
	run_local_warm_queries(eligible_queries)
	from hsreplaynet.billing.utils import (
		get_premium_cache_warming_contexts_from_subscriptions
	)
	contexts = get_premium_cache_warming_contexts_from_subscriptions()
	fill_personalized_query_queue(contexts, eligible_queries)


def fill_global_query_queue(eligible_queries=None):
	queue_name = settings.REDSHIFT_ANALYTICS_QUERY_QUEUE_NAME
	messages = get_queries_for_cache_warming(eligible_queries)
	stales_queries = filter_freshly_cached_queries(messages)
	write_messages_to_queue(queue_name, stales_queries)


def run_local_warm_queries(eligible_queries=None):
	messages = get_queries_for_cache_warming(eligible_queries)
	log.info("Generated %i global query permutations for cache warming." % len(messages))
	stale_queries = filter_freshly_cached_queries(messages)
	msg = "%i permutations remain after filtering fresh queries" % len(stale_queries)
	log.info(msg)
	for msg in stale_queries:
		query = queries.get_query(msg["query_name"])
		params = query.build_full_params(msg["supplied_parameters"])
		execute_query(query, params, run_local=True)


def fill_personalized_query_queue(contexts, eligible_queries=None):
	queue_name = settings.REDSHIFT_PERSONALIZED_QUERY_QUEUE_NAME
	messages = get_personalized_queries_for_cache_warming(
		contexts,
		eligible_queries
	)
	log.info("Generated %i personalized permutations for cache warming." % len(messages))
	stale_queries = filter_freshly_cached_queries(messages)
	msg = "%i personalized perms remain after filtering fresh queries" % len(stale_queries)
	log.info(msg)
	write_messages_to_queue(queue_name, stale_queries)


def _permutation_matches_game_types(perm, game_types):
	gt = perm.get("GameType", None)
	is_w = gt == "RANKED_WILD" and BnetGameType.BGT_RANKED_WILD in game_types
	is_s = gt == "RANKED_STANDARD" and BnetGameType.BGT_RANKED_STANDARD in game_types
	return is_w or is_s


def get_personalized_queries_for_cache_warming(contexts, eligible_queries=None):
	queries = []
	for query in RedshiftCatalogue.instance().personalized_queries:
		is_eligible = eligible_queries is None or query.name in eligible_queries
		if query.cache_warming_enabled and is_eligible:
			for permutation in query.generate_personalized_parameter_permutation_bases():
				# Each permutation will still be missing a Region and account_lo value
				for ctx in contexts:
					for pegasus_account in ctx.pegasus_accounts:
						new_permutation = copy.copy(permutation)
						new_permutation["Region"] = pegasus_account.region.name
						new_permutation["account_lo"] = pegasus_account.account_lo
						if "deck_id" in query.get_available_non_filter_parameters():
							for deck, gts in ctx.decks.items():
								if _permutation_matches_game_types(new_permutation, gts):
									new_permutation_for_deck = copy.copy(new_permutation)
									new_permutation_for_deck["deck_id"] = deck.id
									msg = "Warming: %s: %s" % (
										str(new_permutation_for_deck),
										str(query.name)
									)
									log.info(msg)
									queries.append({
										"query_name": query.name,
										"supplied_parameters": new_permutation_for_deck
									})
						else:
							msg = "Warming: %s: %s" % (
								str(new_permutation),
								str(query.name)
							)
							log.info(msg)
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


def get_queries_for_cache_warming(eligible_queries=None):
	queries = []
	for query in RedshiftCatalogue.instance().cache_warm_eligible_queries:
		is_eligible = eligible_queries is None or query.name in eligible_queries
		if is_eligible:
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
