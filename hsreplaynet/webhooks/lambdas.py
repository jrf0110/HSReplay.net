import logging
from hsreplaynet.utils.instrumentation import lambda_handler


@lambda_handler(runtime="python3.6", cpu_seconds=120)
def trigger_webhook(event, context):
	"""
	A handler that handles firing game replay webhooks.
	"""
	from hsreplaynet.webhooks.models import Webhook

	logger = logging.getLogger("hsreplaynet.lambdas.trigger_webhook")
	webhook_uuid = event["webhook_uuid"]
	url = event["url"]
	payload = {
		"uuid": webhook_uuid,
		"event": "REPLAY_UPLOADED",
		"data": event["data"],
	}

	logger.info("Triggering webhook %r on %r", webhook_uuid, url)
	webhook = Webhook.objects.get(uuid=webhook_uuid)
	webhook.immediate_trigger(url, payload)
