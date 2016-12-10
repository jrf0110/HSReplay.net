from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from hsreplaynet.utils import log
from hsreplaynet.utils.influx import influx_write_payload


class BattleNetAdapter(DefaultSocialAccountAdapter):
	def is_auto_signup_allowed(self, request, sociallogin):
		# Force users to pick a username if they don't have a battletag
		battletag = sociallogin.account.extra_data.get("battletag")
		if not battletag:
			return False
		return super().is_auto_signup_allowed(request, sociallogin)

	def authentication_error(self, request, provider_id, error, exception, extra_context):
		# Triggered upon social network login failure.
		log.error("[%s] Authentication error: %r (exception=%r)", provider_id, error, exception)
		# Write the error details to Influx
		region = request.GET.get("region", "us")
		payload = {
			"measurement": "hsreplaynet_socialauth_error",
			"tags": {
				"provider_id": provider_id,
				"error": error,
				"region": region,
			},
			"fields": {
				"exception": str(exception),
			}
		}
		influx_write_payload([payload])

	def save_user(self, request, sociallogin, form=None):
		user = super().save_user(request, sociallogin, form)
		# XXX: Remove once we upgrade to Allauth 0.30
		# See https://github.com/pennersr/django-allauth/pull/1556
		battletag = sociallogin.account.extra_data.get("battletag")
		if battletag:
			user.username = battletag
			user.save()
		return user
