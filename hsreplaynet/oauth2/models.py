from django.db import models
from django.urls import reverse
from oauth2_provider.models import AbstractApplication


class Application(AbstractApplication):
	description = models.TextField(blank=True)
	homepage = models.URLField()

	def get_absolute_url(self):
		return reverse("oauth2_app_update", kwargs={"pk": self.pk})
