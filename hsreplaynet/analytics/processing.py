import copy
import json
import time
from collections import defaultdict
from datetime import timedelta
from django.conf import settings
from django.core.cache import caches
from django.utils import timezone
from hearthstone.enums import BnetGameType
from redis_lock import Lock as RedisLock
from redis_semaphore import Semaphore
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from hsredshift.analytics.queries import RedshiftCatalogue
from hsreplaynet.utils import log
from hsreplaynet.utils.aws.clients import LAMBDA
from hsreplaynet.utils.aws.sqs import write_messages_to_queue
from hsreplaynet.utils.influx import influx_metric


def execute_query(parameterized_query, run_local=False):
	if run_local:
		_do_execute_query_work(parameterized_query)

	# It's safe to launch multiple attempts to execute for the same query
	# Because the dogpile lock will only allow one to execute
	# But we can save resources by not even launching the attempt
	# If we see that the lock already exists
	if not _lock_exists(parameterized_query.cache_key):
		log.info("No lock already exists for query. Will attempt to execute async.")

		if settings.ENV_AWS and settings.PROCESS_REDSHIFT_QUERIES_VIA_LAMBDA:
			# In PROD use Lambdas so the web-servers don't get overloaded
			LAMBDA.invoke(
				FunctionName="execute_redshift_query",
				InvocationType="Event",  # Triggers asynchronous invocation
				Payload=_to_lambda_payload(parameterized_query),
			)
		else:
			_do_execute_query_work(parameterized_query)
	else:
		msg = "An async attempt to run this query is in-flight. Will not launch another."
		log.info(msg)


def _to_lambda_payload(parameterized_query):
	payload = {
		"query_name": parameterized_query.query_name,
		"supplied_parameters": parameterized_query.supplied_parameters
	}

	return json.dumps(payload)


def _do_execute_query(parameterized_query, wlm_queue=None):
	# This method should always be getting executed within a Lambda context

	# Distributed dog pile lock pattern
	# From: https://pypi.python.org/pypi/python-redis-lock
	log.info("About to attempt acquiring lock...")
	redis_client = get_redshift_cache_redis_client()

	with RedisLock(redis_client, parameterized_query.cache_key, expire=300):
		# Get a lock with a 5-minute lifetime since that's the maximum duration of a Lambda
		# to ensure the lock is held for as long as the Python process / Lambda is running.
		log.info("Lock acquired.")
		return _do_execute_query_work(parameterized_query, wlm_queue)


def _do_execute_query_work(parameterized_query, wlm_queue=None):
	if not parameterized_query.result_is_stale:
		log.info("Up-to-date cached data exists. Exiting without running query.")
	else:
		log.info("Cached data missing or stale. Executing query now.")
		# DO EXPENSIVE WORK
		start_ts = time.time()
		exception_raised = False
		exception_msg = None
		try:
			parameterized_query.refresh_result(wlm_queue)
		except Exception as e:
			exception_raised = True
			exception_msg = str(e)
			raise
		finally:
			end_ts = time.time()
			duration_seconds = round(end_ts - start_ts, 2)

			query_execute_metric_fields = {
				"duration_seconds": duration_seconds,
				"exception_message": exception_msg
			}
			query_execute_metric_fields.update(
				parameterized_query.supplied_non_filters_dict
			)

			influx_metric(
				"redshift_query_execute",
				query_execute_metric_fields,
				exception_thrown=exception_raised,
				query_name=parameterized_query.query_name,
				**parameterized_query.supplied_filters_dict
			)


def evict_locks_cache(params):
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
	return create_engine(
		settings.REDSHIFT_CONNECTION,
		poolclass=NullPool,
		connect_args={"sslmode": "disable"}
	)


def get_redshift_catalogue():
	cache = get_redshift_cache_redis_client()
	engine = get_redshift_engine()
	return RedshiftCatalogue.instance(cache, engine)


def get_new_redshift_connection(autocommit=True):
	conn = get_redshift_engine().connect()
	if autocommit:
		conn.execution_options(isolation_level="AUTOCOMMIT")
	return conn


class PremiumUserCacheWarmingContext:
	def __init__(self, user, blizzard_account_map):
		self.user = user
		self.blizzard_account_map = blizzard_account_map

	@classmethod
	def from_user(cls, user):
		time_horizon = timezone.now() - timedelta(days=30)
		blizzard_accounts = list(user.blizzard_accounts.all())
		blizzard_account_deck_map = defaultdict(lambda: defaultdict(set))
		for blizzard_account in blizzard_accounts:
			# Make sure this gets initialized if it exists
			# even when there are no games attached
			deck_map_for_account = blizzard_account_deck_map[blizzard_account]
			ggps = blizzard_account.globalgameplayer_set.select_related(
				"game", "deck_list"
			).filter(game__match_start__gte=time_horizon)
			for ggp in ggps.all():
				deck = ggp.deck_list
				if deck.size == 30:
					game_type = ggp.game.game_type
					deck_map_for_account[deck].add(game_type)

		return PremiumUserCacheWarmingContext(user, blizzard_account_deck_map)

	@property
	def blizzard_accounts(self):
		return self.blizzard_account_map.keys()

	def get_deck_map_for_account(self, account):
		return self.blizzard_account_map[account]


def warm_redshift_cache_for_user_context(context):
	# This should be called whenever a user becomes premium
	fill_personalized_query_queue([context])


def fill_redshift_cache_warming_queue(eligible_queries=None):
	from hsreplaynet.billing.utils import (
		get_premium_cache_warming_contexts_from_subscriptions
	)
	contexts = get_premium_cache_warming_contexts_from_subscriptions()
	fill_personalized_query_queue(contexts, eligible_queries)


def fill_global_query_queue(eligible_queries=None, filter_fresh_queries=True):
	queue_name = settings.REDSHIFT_ANALYTICS_QUERY_QUEUE_NAME
	messages = get_queries_for_cache_warming(eligible_queries)
	log.info("Generated %i global query permutations for cache warming." % len(messages))
	if filter_fresh_queries:
		messages = filter_freshly_cached_queries(messages)
		msg = "%i permutations remain after filtering fresh queries" % len(messages)
		log.info(msg)
	write_messages_to_queue(queue_name, messages)


def run_local_warm_queries(eligible_queries=None):
	messages = get_queries_for_cache_warming(eligible_queries)
	log.info("Generated %i global query permutations for cache warming." % len(messages))
	stale_queries = filter_freshly_cached_queries(messages)
	msg = "%i permutations remain after filtering fresh queries" % len(stale_queries)
	log.info(msg)
	for msg in stale_queries:
		query = get_redshift_catalogue().get_query(msg["query_name"])
		parameterized_query = query.build_full_params(msg["supplied_parameters"])
		execute_query(parameterized_query, run_local=True)


def synchronize_all_pegasus_accounts():
	# To be called at the start (or end) of each ETL cycle
	pass


def synchronize_single_pegasus_account(account):
	# To be called whenever a new premium subscription is created.
	pass


def fill_personalized_query_queue(contexts, eligible_queries=None):
	queue_name = settings.REDSHIFT_ANALYTICS_QUERY_QUEUE_NAME
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


def get_personalized_queries_for_cache_warming(
	contexts,
	eligible_queries=None,
	catalogue=None
):
	redshift_catalogue = catalogue if catalogue else get_redshift_catalogue()
	queries = []
	for query in redshift_catalogue.personalized_queries:
		is_eligible = eligible_queries is None or query.name in eligible_queries

		if query.cache_warming_enabled and is_eligible:
			for permutation in query.generate_personalized_parameter_permutation_bases():
				# Each permutation will still be missing a Region and account_lo value
				for ctx in contexts:
					for blizzard_account in ctx.blizzard_accounts:
						new_permutation = copy.copy(permutation)
						new_permutation["Region"] = blizzard_account.region.name
						new_permutation["account_lo"] = blizzard_account.account_lo
						if "deck_id" in query.get_available_non_filter_parameters():
							deck_map_for_account = ctx.get_deck_map_for_account(blizzard_account)

							for deck, gts in deck_map_for_account.items():
								if _permutation_matches_game_types(new_permutation, gts):
									new_permutation_for_deck = copy.copy(new_permutation)
									new_permutation_for_deck["deck_id"] = deck.id
									log.info("Warming: %s: %s", new_permutation_for_deck, query.name)
									queries.append({
										"query_name": query.name,
										"supplied_parameters": new_permutation_for_deck,
									})
						else:
							log.info("Warming: %s: %s", new_permutation, query.name)
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
		query = get_redshift_catalogue().get_query(msg["query_name"])
		parameterized_query = query.build_full_params(msg["supplied_parameters"])

		if not parameterized_query.result_available or parameterized_query.result_is_stale:
			# Keep this message because the cache is stale
			result.append(msg)

	return result


def get_queries_for_cache_warming(eligible_queries=None):
	queries = []
	for query in get_redshift_catalogue().cache_warm_eligible_queries:
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
