import json
import time
import traceback
from datetime import datetime
from enum import IntEnum
from uuid import uuid4
from django.conf import settings
from django.contrib.postgres.fields import JSONField
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models
from django.urls import reverse
from django_intenum import IntEnumField
from requests import Request, Session
from .validators import WebhookURLValidator


RESPONSE_BODY_MAX_SIZE = 4096
WEBHOOK_CONTENT_TYPE = "application/json"
WEBHOOK_USER_AGENT = settings.WEBHOOKS["USER_AGENT"]


class ForbiddenWebhookDelivery(Exception):
	pass


def generate_signature(key, message):
	"""
	Generate a signature for an utf8-encoded payload.

	Similar implementations:
	- https://developer.github.com/webhooks/securing/
	- https://stripe.com/docs/webhooks#signatures
	"""
	from hashlib import sha256
	from hmac import HMAC

	timestamp = int(datetime.now().timestamp())
	message = "{t}.{message}".format(t=timestamp, message=message)
	mac = HMAC(key, message.encode("utf-8"), digestmod=sha256)

	return "t={t}, sha256={sha256}".format(
		t=timestamp, sha256=mac.hexdigest()
	)


class WebhookStatus(IntEnum):
	UNKNOWN = 0
	PENDING = 1
	IN_PROGRESS = 2
	SUCCESS = 3
	ERROR = 4


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

	def create_webhooks(self):
		endpoints = self.user.webhook_endpoints.filter(is_active=True, is_deleted=False)
		payload = {
			"event": self.uuid,
			"type": self.type,
			"data": self.data,
			"created": int(self.created.timestamp()),
		}
		for endpoint in endpoints:
			webhook = Webhook.objects.create(
				endpoint=endpoint, url=endpoint.url, event=self, payload=payload
			)
			webhook.schedule_delivery()


class WebhookEndpoint(models.Model):
	uuid = models.UUIDField(primary_key=True, editable=False, default=uuid4)
	url = models.URLField(
		validators=[WebhookURLValidator()],
		help_text="The URL the webhook will POST to."
	)
	secret = models.UUIDField(
		editable=False, default=uuid4,
		help_text="Salt for the X-Webhook-Signature header sent with the payload",
	)
	timeout = models.PositiveSmallIntegerField(
		default=10, help_text="Timeout (in seconds) the triggers have before they fail."
	)
	user = models.ForeignKey(
		settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="webhook_endpoints"
	)

	is_active = models.BooleanField(default=True, help_text="Whether the listener is enabled.")
	is_deleted = models.BooleanField(default=False)
	created = models.DateTimeField(auto_now_add=True)
	updated = models.DateTimeField(auto_now=True)

	def __str__(self):
		return self.url

	def get_absolute_url(self):
		return reverse("account_update_webhook", kwargs={"pk": str(self.pk)})

	def delete(self):
		self.is_deleted = True
		self.save()

	def send_test_event(self):
		payload = {
			"event": None,
			"type": "test",
			"data": {},
			"created": int(datetime.now().timestamp()),
		}
		webhook = Webhook.objects.create(
			endpoint=self, url=self.url, event=None, payload=payload
		)
		webhook.schedule_delivery()


class Webhook(models.Model):
	uuid = models.UUIDField(primary_key=True, editable=False, default=uuid4)
	endpoint = models.ForeignKey(
		WebhookEndpoint, null=True, on_delete=models.SET_NULL, related_name="webhooks"
	)
	url = models.URLField()
	event = models.ForeignKey(
		Event, null=True, on_delete=models.SET_NULL, related_name="webhooks"
	)
	payload = JSONField(encoder=DjangoJSONEncoder)
	status = IntEnumField(enum=WebhookStatus, default=WebhookStatus.UNKNOWN)

	created = models.DateTimeField(auto_now_add=True)
	updated = models.DateTimeField(auto_now=True)

	def __str__(self):
		return "%s -> %s" % (self.event, self.url)

	def schedule_delivery(self):
		"""
		Schedule the webhook for delivery.

		On ENV_AWS, this schedules a Lambda trigger.
		Otherwise, triggers immediately.
		"""
		self.status = WebhookStatus.PENDING
		self.save()

		if settings.ENV_AWS:
			from hsreplaynet.utils.aws.clients import LAMBDA
			LAMBDA.invoke(
				FunctionName="trigger_webhook",
				InvocationType="Event",
				Payload=json.dumps({"webhook": str(self.pk)}),
			)
		else:
			self.deliver()

	def deliver(self):
		if not self.endpoint:
			raise ForbiddenWebhookDelivery("Cannot deliver a webhook with no endpoint.")

		if self.status != WebhookStatus.PENDING:
			raise ForbiddenWebhookDelivery("Not triggering for status %r" % (self.status))

		self.status = WebhookStatus.IN_PROGRESS
		self.save()

		secret = str(self.endpoint.secret).encode("utf-8")
		body = json.dumps(self.payload, cls=DjangoJSONEncoder).encode("utf-8")
		signature = generate_signature(secret, body)
		default_headers = {
			"content-type": WEBHOOK_CONTENT_TYPE,
			"user-agent": WEBHOOK_USER_AGENT,
			"x-webhook-signature": signature,
		}
		session = Session()
		request = session.prepare_request(
			Request("POST", self.url, headers=default_headers, data=body)
		)

		delivery = WebhookDelivery(
			webhook=self, url=request.url, request_headers=dict(request.headers), request_body=body
		)
		begin = time.time()
		try:
			response = session.send(request, allow_redirects=False, timeout=self.endpoint.timeout)
		except Exception as e:
			delivery.success = False
			delivery.error = str(e)
			delivery.traceback = traceback.format_exc()
			self.status = WebhookStatus.ERROR
		else:
			delivery.success = 200 <= response.status_code <= 299
			delivery.response_status = response.status_code
			delivery.response_headers = dict(response.headers)
			delivery.response_body = response.text[:RESPONSE_BODY_MAX_SIZE]
			self.status = WebhookStatus.SUCCESS

		delivery.completed_time = int((time.time() - begin) * 1000)
		delivery.save()
		self.save()


class WebhookDelivery(models.Model):
	uuid = models.UUIDField(primary_key=True, editable=False, default=uuid4)
	webhook = models.ForeignKey(
		Webhook, null=True, on_delete=models.SET_NULL, related_name="deliveries"
	)
	url = models.URLField()
	request_headers = JSONField()
	request_body = models.TextField(blank=True)
	response_status = models.PositiveSmallIntegerField(null=True)
	response_headers = JSONField(blank=True)
	response_body = models.TextField(blank=True)
	completed_time = models.PositiveIntegerField()
	success = models.BooleanField()
	error = models.TextField(blank=True)
	traceback = models.TextField(blank=True)

	created = models.DateTimeField(auto_now_add=True)
	updated = models.DateTimeField(auto_now=True)

	def __str__(self):
		if self.error:
			s = "%s (%s)" % (self.response_status, self.error)
		else:
			s = str(self.response_status)
		return "%s: %s" % (self.url, s)
