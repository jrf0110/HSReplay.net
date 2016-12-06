from uuid import uuid4
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models


class AuthToken(models.Model):
	key = models.UUIDField("Key", primary_key=True, editable=False, default=uuid4)
	user = models.ForeignKey(
		settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
		related_name="auth_tokens", null=True, blank=True
	)
	created = models.DateTimeField("Created", auto_now_add=True)
	creation_apikey = models.ForeignKey("api.APIKey", related_name="tokens")

	test_data = models.BooleanField(default=False)

	def __str__(self):
		return str(self.key)

	@staticmethod
	def get_token_from_header(header):
		header = header.lower()

		method, _, token = header.partition(" ")
		if method != "token":
			return

		try:
			return AuthToken.objects.get(key=token)
		except (AuthToken.DoesNotExist, ValueError):
			pass

	def create_fake_user(self, save=True):
		"""
		Create a User instance with the same username as the key UUID.
		The user has the is_fake attribute set to True.
		"""
		User = get_user_model()
		user = User.objects.create(username=str(self.key), is_fake=True)
		self.user = user
		if save:
			self.save()
		return user


class APIKey(models.Model):
	api_key = models.UUIDField(blank=True, default=uuid4, editable=False)
	full_name = models.CharField(max_length=254)
	email = models.EmailField()
	website = models.URLField(blank=True)
	enabled = models.BooleanField(default=True)

	def __str__(self):
		return self.full_name
