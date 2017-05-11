from uuid import uuid4
from django.db import models


class APIKey(models.Model):
	api_key = models.UUIDField(blank=True, default=uuid4, editable=False)
	full_name = models.CharField(max_length=254)
	email = models.EmailField()
	website = models.URLField(blank=True)
	enabled = models.BooleanField(default=True)

	def __str__(self):
		return self.full_name
