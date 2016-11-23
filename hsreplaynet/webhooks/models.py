import json
import time
import requests
from uuid import uuid4
from django.db import models
from django.urls import reverse
from hsreplaynet.accounts.models import User
from .validators import WebhookURLValidator


class Webhook(models.Model):
	uuid = models.UUIDField(primary_key=True, editable=False, default=uuid4)

	url = models.URLField(
		validators=[WebhookURLValidator()],
		help_text="The URL the webhook will POST to."
	)
	user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="webhooks")
	is_active = models.BooleanField(default=True)
	is_deleted = models.BooleanField(default=False)
	max_triggers = models.PositiveSmallIntegerField(
		default=0,
		help_text="How many triggers after which the Webhook will be deleted. (0 for unlimited)"
	)
	created = models.DateTimeField(auto_now_add=True)
	modified = models.DateTimeField(auto_now=True)
	timeout = models.PositiveSmallIntegerField(default=10)

	def __str__(self):
		return str(self.uuid)

	def get_absolute_url(self):
		return reverse("account_update_webhook", kwargs={"pk": self.pk})

	def delete(self):
		self.is_deleted = True
		self.save()

	def trigger(self, data):
		from django.conf import settings

		payload = {
			"webhook_uuid": str(self.uuid),
			"data": data,
		}

		if settings.ENV_AWS:
			self.schedule_lambda_trigger(self.url, payload)
		else:
			self.immediate_trigger(self.url, payload)

	def schedule_lambda_trigger(self, url, payload):
		from hsreplaynet.utils.aws.clients import LAMBDA

		final_payload = json.dumps({
			"webhook_uuid": self.uuid,
			"url": url,
			"payload": payload,
		})

		LAMBDA.invoke(
			FunctionName="trigger_webhook",
			InvocationType="Event",  # Triggers asynchronous invocation
			Payload=final_payload,
		)

	def immediate_trigger(self, url, payload):
		t = WebhookTrigger(
			webhook=self,
			url=url,
			payload=payload,
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

	@property
	def content_type(self):
		return "application/json"

	def deliver(self, timeout):
		begin = time.time()
		headers = {"Content-Type": self.content_type}

		try:
			r = requests.post(self.url, data=self.payload, headers=headers, timeout=timeout)
			self.response_status = r.status_code
			self.response = r.text[:8192]
			self.success = r.status_code in (200, 201)
		except Exception as e:
			self.response_status = 0
			self.response = str(e)
			self.success = False

		self.completed_time = int((time.time() - begin) * 1000)
		self.save()
