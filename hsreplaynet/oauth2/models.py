from django.db import models
from django.urls import reverse
from oauth2_provider.models import AbstractApplication
from oauth2_provider.scopes import SettingsScopes


class Application(AbstractApplication):
	allowed_scopes = models.TextField(
		blank=True,
		help_text="Which scopes the application is allowed to request (blank = all scopes)"
	)
	description = models.TextField(blank=True)
	homepage = models.URLField()

	def get_absolute_url(self):
		return reverse("oauth2_app_update", kwargs={"pk": self.pk})


class ApplicationScopes(SettingsScopes):
	"""
	A scopes backend which imitates the default SettingsScopes but also checks
	the `allowed_scopes` field on Application to determine what an app can request.
	If anything is specified in `allowed_scopes`, those are used instead.
	"""
	def get_available_scopes(self, application=None, request=None, *args, **kwargs):
		if application is not None and application.allowed_scopes.strip():
			return application.allowed_scopes.strip().split()

		return super().get_available_scopes(application, request, *args, **kwargs)
