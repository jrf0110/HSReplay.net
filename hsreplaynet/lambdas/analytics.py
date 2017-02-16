import logging
from django.conf import settings
from hsredshift.analytics import queries
from hsreplaynet.utils import instrumentation
from hsreplaynet.utils.influx import influx_metric
from hsreplaynet.analytics.processing import (
	_do_execute_query, get_redshift_cache_redis_client
)
from redis_semaphore import Semaphore, NotAvailable


@instrumentation.lambda_handler(
	cpu_seconds=300,
	requires_vpc_access=True
)
def execute_redshift_query(event, context):
	"""A handler that executes Redshift queries for the webserver"""
	logger = logging.getLogger("hsreplaynet.lambdas.execute_redshift_query")

	concurrent_redshift_query_semaphore = Semaphore(
		get_redshift_cache_redis_client(),
		count=settings.REDSHIFT_ANALYTICS_QUERY_CONCURRENCY_LIMIT,
		namespace='redshift_analytics_queries',
		blocking=False
	)

	query_name = event["query_name"]
	logger.info("Query Name: %s" % query_name)

	supplied_params = event["supplied_parameters"]
	logger.info("Query Params: %s" % supplied_params)

	query = queries.get_query(query_name)
	params = query.build_full_params(supplied_params)

	try:
		with concurrent_redshift_query_semaphore:
			_do_execute_query(query, params)
			logger.info("Query Execution Complete")
	except NotAvailable:
		logger.warn("The Redshift query queue was already at max concurrency. Skipping query.")
		influx_metric(
			"redshift_concurrent_query_limit_exceeded",
			{"count": 1},
			query_name=query_name
		)
