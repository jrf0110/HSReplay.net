import logging
from hsredshift.analytics import queries
from hsreplaynet.utils import instrumentation
from hsreplaynet.analytics.processing import _do_execute_query


@instrumentation.lambda_handler(
	cpu_seconds=300,
	requires_vpc_access=True
)
def execute_redshift_query(event, context):
	"""A handler that executes Redshift queries for the webserver"""
	logger = logging.getLogger("hsreplaynet.lambdas.execute_redshift_query")

	query_name = event["query_name"]
	logger.info("Query Name: %s" % query_name)

	supplied_params = event["supplied_parameters"]
	logger.info("Query Params: %s" % supplied_params)

	query = queries.get_query(query_name)
	params = query.build_full_params(supplied_params)

	_do_execute_query(query, params)
