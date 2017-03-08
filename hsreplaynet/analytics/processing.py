import json
import time
import copy
from django.core.cache import caches
from django.conf import settings
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from hsreplaynet.utils.influx import influx_metric
from hsreplaynet.utils.aws.clients import LAMBDA
from hsreplaynet.utils.aws.sqs import write_messages_to_queue
from hsreplaynet.utils import log
from hearthstone.enums import CardSet
from hearthstone.cardxml import load
from hsredshift.analytics.filters import GameType
from hsredshift.analytics.queries import RedshiftCatalogue
from hsredshift.analytics.library.base import RedshiftQueryParams
import redis_lock
from redis_semaphore import Semaphore


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


def _do_execute_query(query, params):
	# This method should always be getting executed within a Lambda context

	# Distributed dog pile lock pattern
	# From: https://pypi.python.org/pypi/python-redis-lock
	log.info("About to attempt acquiring lock...")
	redis_client = get_redshift_cache_redis_client()

	with redis_lock.Lock(redis_client, params.cache_key, expire=300):
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
			try:
				response_payload = query.execute(redshift_connection, params)
			except Exception as e:
				exception_raised = True
				exception_msg = str(e)
				raise
			finally:
				end_ts = time.time()
				duration_seconds = round(end_ts - start_ts, 2)
				redshift_connection.close()

				query_execute_metric_fields = {
					"duration_seconds": duration_seconds,
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
	# Also attempt to evict any lingering locks
	redis_client = get_redshift_cache_redis_client()
	lock_signal_key = _get_lock_signal_key(cache_key)
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


def fill_redshift_cache_warming_queue(eligible_queries=None):
	queue_name = settings.REDSHIFT_ANALYTICS_QUERY_QUEUE_NAME
	messages = get_queries_for_cache_warming(eligible_queries)
	stales_queries = filter_freshly_cached_queries(messages)
	write_messages_to_queue(queue_name, stales_queries)


def filter_freshly_cached_queries(messages):
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
	card_db, _ = load()
	for query in RedshiftCatalogue.instance().inventory.values():
		if not query.is_personalized:
			if eligible_queries is None or query.name in eligible_queries:
				for permutation in _generate_permutations_for_query(query, card_db):
					queries.append({
						"query_name": query.name,
						"supplied_parameters": permutation
					})
	return queries


def _generate_permutations_for_query(query, card_db):
	result = []

	for parameter_permutation in query.generate_supported_filter_permutations():
		non_filter_parameters = query.get_available_non_filter_parameters()
		if len(non_filter_parameters) == 0:
			result.append(parameter_permutation)
		elif len(non_filter_parameters) == 1:
			non_filter_parameter = non_filter_parameters[0]
			if non_filter_parameter == "card_id":
				for id, card in card_db.items():
					if card.collectible and query.is_valid_for_card(card.dbf_id):
						game_type = parameter_permutation.get("GameType", "")
						if _is_wild(card):
							if game_type == GameType.RANKED_WILD.name:
								new_permutation = copy.copy(parameter_permutation)
								new_permutation["card_id"] = card.dbf_id
								result.append(new_permutation)
						else:
							new_permutation = copy.copy(parameter_permutation)
							new_permutation["card_id"] = card.dbf_id
							result.append(new_permutation)

			elif non_filter_parameter == "deck_id":
				if "GameType" in parameter_permutation:
					game_type = parameter_permutation["GameType"]
				else:
					game_type = "RANKED_STANDARD"

				for deck_id in _get_eligible_deck_ids(game_type):
					new_permutation = copy.copy(parameter_permutation)
					new_permutation["deck_id"] = deck_id
					result.append(new_permutation)
			elif non_filter_parameter == "account_lo":
				# TODO: Add the ability to enumerage the account_lo values for each registered account
				pass
			else:
				raise RuntimeError("Support for filter %s not implemented." % non_filter_parameter)
		else:
			raise RuntimeError("Support for multiple non filter params not implemented")

	return result


def _is_wild(card):
	return card.card_set in (CardSet.NAXX, CardSet.GVG)


_eligible_decks_cache = {}


def _get_eligible_deck_ids(game_type):
	if game_type not in _eligible_decks_cache:
		list_decks_query = RedshiftCatalogue.instance().get_query("list_decks_by_win_rate")
		params = list_decks_query.build_full_params(dict(GameType=game_type))
		result_set = list_decks_query.as_result_set().execute(get_redshift_engine(), params)
		_eligible_decks_cache[game_type] = [row["deck_id"] for row in result_set]
	return _eligible_decks_cache[game_type]


def get_concurrent_redshift_query_semaphore():
	concurrent_redshift_query_semaphore = Semaphore(
		get_redshift_cache_redis_client(),
		count=settings.REDSHIFT_ANALYTICS_QUERY_CONCURRENCY_LIMIT,
		namespace='redshift_analytics_queries',
		stale_client_timeout=300,
		blocking=False
	)
	return concurrent_redshift_query_semaphore
