import json
import time
from hsreplaynet.utils import log
from .clients import SQS


def get_or_create_queue(queue_name):
	# If the queue already exists, the existing queue will be returned.
	response = SQS.create_queue(QueueName=queue_name)
	return response["QueueUrl"]


def write_messages_to_queue(queue_name, messages):
	queue_url = get_or_create_queue(queue_name)

	# Messages can be batched to SQS 10 at a time
	for batch in batches(messages, 10):
		entries = []
		for id, message in enumerate(batch):
			entries.append({
				"Id": str(id),
				"MessageBody": json.dumps(message, separators=(",", ":"))
			})

		response = SQS.send_message_batch(QueueUrl=queue_url, Entries=entries)
		if "Failed" in response and len(response["Failed"]):
			log.error(json.dumps(response["Failed"]))
			raise RuntimeError(json.dumps(response["Failed"]))


def batches(l, n):
	"""Yield successive n-sized chunks from l."""
	for i in range(0, len(l), n):
		yield l[i:i + n]


def get_messages(queue_name, max_num=10):
	result = []
	do_receive = True

	while do_receive and len(result) < max_num:
		response = SQS.receive_message(
			QueueUrl=get_or_create_queue(queue_name),
			MaxNumberOfMessages=10
		)
		messages = response.get("Messages", [])
		if len(messages):
			result.extend(messages)
		else:
			do_receive = False

	return result


def get_approximate_queue_size(queue_name):
	attributes = [
		"ApproximateNumberOfMessages",
		"ApproximateNumberOfMessagesDelayed",
		"ApproximateNumberOfMessagesNotVisible"
	]
	response = SQS.get_queue_attributes(
		QueueUrl=get_or_create_queue(queue_name),
		AttributeNames=attributes
	)
	return sum(int(response['Attributes'][attrib]) for attrib in attributes)


def block_until_empty(queue_name, poll_interval=10):
	while get_approximate_queue_size(queue_name) > 0:
		time.sleep(poll_interval)
