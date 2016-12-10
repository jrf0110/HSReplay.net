from allauth.socialaccount.adapter import DefaultSocialAccountAdapter


class BattleNetAdapter(DefaultSocialAccountAdapter):
	def is_auto_signup_allowed(self, request, sociallogin):
		battletag = sociallogin.account.extra_data.get("battletag")
		if not battletag:
			return False
		return super().is_auto_signup_allowed(request, sociallogin)

	def save_user(self, request, sociallogin, form=None):
		user = super().save_user(request, sociallogin, form)
		# XXX: Remove once we upgrade to Allauth 0.30
		# See https://github.com/pennersr/django-allauth/pull/1556
		battletag = sociallogin.account.extra_data.get("battletag")
		if battletag:
			user.username = battletag
			user.save()
		return user
