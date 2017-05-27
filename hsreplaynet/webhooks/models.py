import json
import time
from uuid import uuid4
from django.conf import settings
from django.contrib.postgres.fields import JSONField
from django.db import models
from django.urls import reverse
from .validators import WebhookURLValidator


SUCCESS_STATUS_CODES = (200, 201, 204)


class Event(models.Model):
	uuid = models.UUIDField(primary_key=True, editable=False, default=uuid4)
	type = models.CharField(max_length=50, db_index=True)
	data = JSONField(blank=True)
	user = models.ForeignKey(
		settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="events"
	)

	created = models.DateTimeField(auto_now_add=True)
	updated = models.DateTimeField(auto_now=True)

	def __str__(self):
		return self.type


class Webhook(models.Model):
	uuid = models.UUIDField(primary_key=True, editable=False, default=uuid4)

	url = models.URLField(
		validators=[WebhookURLValidator()],
		help_text="The URL the webhook will POST to."
	)
	user = models.ForeignKey(
		settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="webhooks"
	)
	is_active = models.BooleanField(default=True)
	is_deleted = models.BooleanField(default=False)
	max_triggers = models.PositiveSmallIntegerField(
		default=0,
		help_text="How many triggers after which the Webhook will be deleted. (0 for unlimited)"
	)
	created = models.DateTimeField(auto_now_add=True)
	modified = models.DateTimeField(auto_now=True)
	timeout = models.PositiveSmallIntegerField(default=10)
	secret = models.CharField(
		blank=True, max_length=255,
		help_text="Salt for the X-Webhook-Signature header sent with the payload",
	)

	def __str__(self):
		return str(self.uuid)

	def get_absolute_url(self):
		return reverse("account_update_webhook", kwargs={"pk": self.pk})

	def delete(self):
		self.is_deleted = True
		self.save()

	def trigger(self, data):
		payload = {
			"webhook_uuid": str(self.uuid),
			"url": self.url,
			"data": data,
		}

		if settings.ENV_AWS:
			self.schedule_lambda_trigger(self.url, payload)
		else:
			self.immediate_trigger(self.url, payload)

	def _serialize_payload(self, payload):
		import sys
		from enum import IntEnum

		if sys.version_info.major == 2:
			# I wasted six hours on this.
			# No, using a custom encoder isn't possible.
			# Thanks Amazon, for not supporting Python 3 on Lambda. No really.

			def recurse_transform_intenum(o):
				if isinstance(o, dict):
					for k, v in o.items():
						if isinstance(v, IntEnum):
							o[k] = int(v)
						elif isinstance(v, dict):
							recurse_transform_intenum(v)
				return o

			recurse_transform_intenum(payload)

		return json.dumps(payload)

	def schedule_lambda_trigger(self, url, payload):
		from hsreplaynet.utils.aws.clients import LAMBDA

		final_payload = self._serialize_payload(payload)

		LAMBDA.invoke(
			FunctionName="trigger_webhook",
			InvocationType="Event",  # Triggers asynchronous invocation
			Payload=final_payload,
		)

	def immediate_trigger(self, url, payload):
		if payload is None:
			raise ValueError("Cannot trigger Webhook with a null payload")

		t = WebhookTrigger(
			webhook=self,
			url=url,
			payload=json.dumps(payload),
		)
		# Firing the webhook will save it
		t.deliver(timeout=self.timeout)

		if self.max_triggers:
			num_triggers = self.triggers.count()
			if num_triggers >= self.max_triggers:
				self.delete()


class WebhookTrigger(models.Model):
	id = models.BigAutoField(primary_key=True)

	webhook = models.ForeignKey(
		Webhook, null=True, on_delete=models.SET_NULL, related_name="triggers"
	)
	payload = models.TextField(blank=True)
	url = models.URLField(help_text="The URL that is POSTed to")
	response_status = models.PositiveSmallIntegerField(null=True)
	error = models.BooleanField(default=False)
	response = models.TextField(blank=True)
	success = models.BooleanField()
	created = models.DateTimeField(auto_now_add=True)
	completed_time = models.PositiveIntegerField()

	class Meta:
		ordering = ("-created", )

	@property
	def content_type(self):
		return "application/json"

	def generate_signature(self):
		from hmac import HMAC
		from hashlib import sha256

		key = self.webhook.secret.encode("utf-8")
		msg = self.payload.encode("utf-8")
		mac = HMAC(key, msg, digestmod=sha256)

		return "sha256=" + mac.hexdigest()

	def deliver(self, timeout):
		import requests

		begin = time.time()
		headers = {
			"Content-Type": self.content_type,
			"User-Agent": settings.WEBHOOKS["USER_AGENT"],
			"X-Webhook-Signature": self.generate_signature(),
		}

		try:
			r = requests.post(self.url, data=self.payload, headers=headers, timeout=timeout)
			self.response_status = r.status_code
			self.response = r.text[:8192]
			self.success = r.status_code in SUCCESS_STATUS_CODES
		except Exception as e:
			self.response_status = 0
			self.response = str(e)
			self.success = False

		self.completed_time = int((time.time() - begin) * 1000)
		self.save()
