import json
import logging
import time
from threading import Thread
from django.conf import settings
from redis_semaphore import NotAvailable
from hsredshift.analytics import queries
from hsreplaynet.analytics.processing import (
	_do_execute_query, get_concurrent_redshift_query_semaphore
)
from hsreplaynet.utils import instrumentation
from hsreplaynet.utils.aws.clients import SQS
from hsreplaynet.utils.aws.sqs import get_or_create_queue
from hsreplaynet.utils.influx import influx_metric
from hsreplaynet.utils.synchronization import CountDownLatch


@instrumentation.lambda_handler(
	cpu_seconds=300,
	requires_vpc_access=True,
	memory=256,
)
def execute_redshift_query(event, context):
	"""A handler that executes Redshift queries for the webserver"""
	query_name = event["query_name"]
	supplied_params = event["supplied_parameters"]
	do_execute_redshift_query(query_name, supplied_params)


@instrumentation.lambda_handler(
	cpu_seconds=300,
	requires_vpc_access=True,
	memory = 256,
)
def drain_redshift_query_queue(event, context):
	"""A cron'd handler that attempts to drain any queued query requests in SQS."""
	start_time = time.time()
	duration = 0
	# We run for 55 seconds, since the majority of queries take < 5 seconds to finish
	# And the next scheduled invocation of this will be starting a minute after this one.
	while duration < 55:
		did_work = do_drain_redshift_query_queue_iteration()
		if not did_work:
			time.sleep(5)

		current_time = time.time()
		duration = current_time - start_time


def get_messages(max_num=10):
	result = []
	do_receive = True

	while do_receive and len(result) < max_num:
		response = SQS.receive_message(
			QueueUrl=get_or_create_queue(settings.REDSHIFT_ANALYTICS_QUERY_QUEUE_NAME),
			MaxNumberOfMessages=10
		)
		messages = response['Messages'] if 'Messages' in response else []
		if len(messages):
			result.extend(messages)
		else:
			do_receive = False

	return result


def do_drain_redshift_query_queue_iteration():
	logger = logging.getLogger("hsreplaynet.lambdas.drain_redshift_query_queue")
	semaphore = get_concurrent_redshift_query_semaphore()
	available_slots = semaphore.available_count
	logger.info("There are %i available slots" % available_slots)

	# We don't bother to pull more messages than open slots for running queries
	if available_slots:
		messages = get_messages(available_slots)

		if messages:
			countdown_latch = CountDownLatch(len(messages))

			def redshift_query_runner(message):
				query_name = None
				try:
					receipt = message['ReceiptHandle']
					body = json.loads(message['Body'])
					query_name = body["query_name"]
					params = body["supplied_parameters"]

					success = do_execute_redshift_query(query_name, params)
					logger.info("Do Execute Result: %s" % str(success))

					if success:
						# If we don't delete the message then it will be retried in a subsequent lambda
						SQS.delete_message(
							QueueUrl=get_or_create_queue(settings.REDSHIFT_ANALYTICS_QUERY_QUEUE_NAME),
							ReceiptHandle=receipt
						)

				finally:
					logger.debug("Lambda completed for %s Decrementing latch.", str(query_name))
					countdown_latch.count_down()

			for message in messages:
				lambda_invocation = Thread(target=redshift_query_runner, args=(message,))
				lambda_invocation.start()

			# We will exit once all child redshift_query_runners have returned.
			countdown_latch.await()
			return True
		else:
			return False
	else:
		return False


def do_execute_redshift_query(query_name, supplied_params):
	"""A common entry point for the actual execution of queries on Lambda"""
	logger = logging.getLogger("hsreplaynet.lambdas.execute_redshift_query")

	logger.info("Query Name: %s" % query_name)
	logger.info("Query Params: %s" % supplied_params)

	query = queries.get_query(query_name)
	params = query.build_full_params(supplied_params)

	try:
		with get_concurrent_redshift_query_semaphore():
			_do_execute_query(query, params)
			logger.info("Query Execution Complete")
			return True
	except NotAvailable:
		logger.warn("The Redshift query queue was already at max concurrency. Skipping query.")

		metric_fields = {
			"count": 1
		}
		metric_fields.update(params.supplied_non_filters_dict)
		influx_metric(
			"redshift_query_lambda_execution_concurrency_exceeded",
			metric_fields,
			query_name=query_name,
			**params.supplied_filters_dict
		)
		return False
