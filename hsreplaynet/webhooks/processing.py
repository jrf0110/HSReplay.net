import json
from threading import Thread
from django.conf import settings
from hsreplaynet.utils import log
from hsreplaynet.utils.latch import CountDownLatch
from hsreplaynet.utils.aws.clients import LAMBDA
from hsreplaynet.api.serializers import GameReplaySerializer


def fire_web_hooks_for_user(user, replay):
	if user and not user.is_fake:
		# Fake users should never have webhooks
		if user.webhooks.filter(is_active=True, is_deleted=False).count():
			if settings.ENV_AWS:
				async_fire_web_hooks_for_user(user, replay)
			else:
				immediate_fire_web_hooks_for_user(user, replay)


def async_fire_web_hooks_for_user(user, replay):
	payload = json.dumps({"Replay": {"shortid": str(replay.shortid)}})

	LAMBDA.invoke(
		FunctionName="fire_game_replay_webhooks",
		InvocationType="Event",  # Triggers asynchronous invocation
		Payload=payload,
	)


def immediate_fire_web_hooks_for_user(user, replay):
	webhooks = list(user.webhooks.filter(is_active=True, is_deleted=False).all())
	log.info("Found %s webhooks to be fired.", str(len(webhooks)))

	countdown_latch = CountDownLatch(len(webhooks))

	from hsreplaynet.games.processing import get_replay_url

	def webhook_invoker(webhook, replay):
		try:
			s = GameReplaySerializer(replay)
			serialized = s.data
			serialized["url"] = get_replay_url(replay.shortid)
			log.info("About to fire webhook ID:", str(webhook.id))
			webhook.trigger(serialized)
		finally:
			log.info(
				"Webhook with ID: %s completed. Decrementing latch.", str(webhook.id)
			)
			countdown_latch.count_down()

	for webhook in webhooks:
		webhook_invocation = Thread(target=webhook_invoker, args=(webhook, replay))
		webhook_invocation.start()

	# We will exit once all webhook invocations have completed.
	countdown_latch.await()
	log.info("All webhooks completed.")
