import logging
from hsreplaynet.utils.instrumentation import lambda_handler
from .models import Webhook


@lambda_handler(cpu_seconds=90)
def trigger_webhook(event, context):
	"""
	A handler that handles firing game replay webhooks.
	"""
	logger = logging.getLogger("hsreplaynet.webhooks.lambdas.trigger_webhook")
	webhook_pk = event["webhook"]

	logger.info("Preparing to trigger Webhook %r", webhook_pk)
	webhook = Webhook.objects.get(pk=webhook_pk)

	logger.info("Triggering webhook %r", webhook)
	webhook.deliver()
