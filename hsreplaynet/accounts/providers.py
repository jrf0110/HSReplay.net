from allauth.socialaccount.providers.battlenet.provider import BattleNetSocialAccountAdapter


class BattleNetAdapter(BattleNetSocialAccountAdapter):
	def is_auto_signup_allowed(self, request, sociallogin):
		battletag = sociallogin.account.extra_data.get("battletag")
		if not battletag:
			return False
		return super().is_auto_signup_allowed(request, sociallogin)
