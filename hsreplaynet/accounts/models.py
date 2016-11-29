import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.urls import reverse
from django_intenum import IntEnumField
from hsreplaynet.games.models import Visibility


HEARTHSTONE_LOCALES = (
	("enUS", "English"),
	# ("enGB", "English (GB)"),
	("zhTW", "Chinese (TW)"),
	("zhCN", "Chinese (CN)"),
	("frFR", "French"),
	("deDE", "German"),
	("itIT", "Italian"),
	("jaJP", "Japanese"),
	("koKR", "Korean"),
	("plPL", "Polish"),
	("ptBR", "Portuguese (BR)"),
	("ptPT", "Portuguese (PT)"),
	("ruRU", "Russian"),
	("esES", "Spanish (ES)"),
	("esMX", "Spanish (MX)"),
	("thTH", "Thai"),
)


class AccountClaim(models.Model):
	id = models.UUIDField(primary_key=True)
	token = models.OneToOneField("api.AuthToken")
	created = models.DateTimeField("Created", auto_now_add=True)

	def __str__(self):
		return str(self.id)

	def save(self, *args, **kwargs):
		if not self.id:
			self.id = uuid.uuid4()
		return super().save(*args, **kwargs)

	def get_absolute_url(self):
		return reverse("account_claim", kwargs={"id": self.id})

	def get_full_url(self):
		return "https://hsreplay.net" + self.get_absolute_url()


class User(AbstractUser):
	id = models.BigAutoField(primary_key=True)
	username = models.CharField(max_length=150, unique=True)
	battletag = models.CharField(
		max_length=24, blank=True,
		help_text="The user's primary Battle.net username."
	)
	is_fake = models.BooleanField(default=False)

	# Profile fields
	locale = models.CharField(
		max_length=8, default="enUS",
		choices=HEARTHSTONE_LOCALES,
		help_text="The user's preferred Hearthstone locale for display"
	)
	default_replay_visibility = IntEnumField(
		"Default replay visibility",
		enum=Visibility, default=Visibility.Public
	)
	exclude_from_statistics = models.BooleanField(default=False)
	joust_autoplay = models.BooleanField(default=True)

	def delete_replays(self):
		self.replays.update(is_deleted=True)

	def trigger_webhooks(self, replay):
		if self.is_fake:
			# Fake users should never have webhooks
			return

		webhooks = self.webhooks.filter(is_active=True, is_deleted=False)
		if webhooks.count():
			data = replay.serialize()
			for webhook in webhooks:
				webhook.trigger(data)


class AccountDeleteRequest(models.Model):
	user = models.OneToOneField(User)
	reason = models.TextField(blank=True)
	delete_replay_data = models.BooleanField(default=False)
	created = models.DateTimeField(auto_now_add=True)
	updated = models.DateTimeField(auto_now=True)

	def __str__(self):
		return "Delete request for %s" % (self.user)

	def process(self):
		if self.user.last_login > self.updated:
			# User logged back in since the request was filed. Request no longer valid.
			return
		if self.delete_replay_data:
			self.user.delete_replays()
		self.user.delete()
