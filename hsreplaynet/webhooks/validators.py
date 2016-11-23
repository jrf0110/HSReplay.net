from socket import gethostbyname
from django.core.exceptions import ValidationError
from django.utils.deconstruct import deconstructible
from django.conf import settings


@deconstructible
class WebhookURLValidator:
	def __call__(self, value):
		u = self.validate_url(value)
		self.validate_netloc(u.netloc)

	def validate_url(self, value):
		from urllib.parse import urlsplit

		try:
			u = urlsplit(value)
		except Exception:
			raise ValidationError("Invalid URL")

		if u.scheme not in settings.WEBHOOKS["SCHEME_WHITELIST"]:
			raise ValidationError("Invalid scheme: %r" % (u.scheme))

		if u.fragment:
			raise ValidationError("URL should not have a fragment (%r)" % ("#" + u.fragment))

		return u

	def validate_netloc(self, netloc):
		if netloc in settings.WEBHOOKS["NETLOC_BLACKLIST"]:
			raise ValidationError("This URL is not allowed.")

		try:
			ip = gethostbyname(netloc)
		except Exception:
			raise ValidationError("Invalid hostname: %r" % (netloc))

		if ip == netloc:
			raise ValidationError("IPs are not allowed.")

		if ip in settings.WEBHOOKS["IP_BLACKLIST"]:
			raise ValidationError("This URL is not allowed.")
