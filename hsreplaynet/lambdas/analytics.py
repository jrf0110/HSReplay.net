import logging
from django.core.cache import caches
from hsreplaynet.utils import instrumentation


@instrumentation.lambda_handler(
	cpu_seconds=300,
	requires_vpc_access=True
)
def execute_redshift_query(event, context):
	"""A handler that executes Redshift queries for the webserver"""
	logger = logging.getLogger("hsreplaynet.lambdas.execute_redshift_query")

	redshift_cache = caches['redshift']
	message = redshift_cache.get("message_for_lambda")
	logger.info("The message for Lambda is: %s" % message)

	# query_name = event["query_name"]
	# logger.info("Query Name: %s" % query_name)
	#
	# supplied_params = event["supplied_parameters"]
	# logger.info("Query Params: %s" % supplied_params)
	#
	# query = queries.get_query(query_name)
	# params = query.build_full_params(supplied_params)
	#
	# _do_execute_query(query, params)
