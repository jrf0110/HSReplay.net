from allauth.account.models import EmailAddress
from allauth.account.views import LoginView as BaseLoginView
from allauth.socialaccount.signals import social_account_added
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.dispatch import receiver
from django.http import HttpResponseForbidden
from django.shortcuts import redirect
from django.utils.http import is_safe_url
from django.views.generic import View

from hearthsim_identity.accounts.models import AccountClaim
from hsreplaynet.games.models import GameReplay
from hsreplaynet.utils import get_uuid_object_or_404, log
from hsreplaynet.utils.influx import influx_metric


class LoginView(BaseLoginView):
	def get(self, request):
		request.head.base_title = ""
		request.head.title = "Sign in to HSReplay.net"
		return super().get(request)


class ClaimAccountView(LoginRequiredMixin, View):
	def get_redirect_url(self, request):
		url = request.GET.get("next", "")
		if url and is_safe_url(url):
			return url
		return settings.LOGIN_REDIRECT_URL

	def get(self, request, id):
		claim = get_uuid_object_or_404(AccountClaim, id=id)
		log.info("Claim %r: Token=%r, User=%r", claim, claim.token, claim.token.user)
		if claim.token.user:
			if claim.token.user.is_fake:
				count = GameReplay.objects.filter(user=claim.token.user).update(user=request.user)
				log.info("Updated %r replays. Deleting %r.", count, claim.token.user)
				# For now we just delete the fake user, because we are not using it.
				claim.token.user.delete()
			else:
				log.warning("%r is a real user. Deleting %r.", claim.token.user, claim)
				# Something's wrong. Get rid of the claim and reject the request.
				claim.delete()
				influx_metric("hsreplaynet_account_claim", {"count": 1}, error=1)
				return HttpResponseForbidden("This token has already been claimed.")
		claim.token.user = request.user
		claim.token.save()
		# Replays are claimed in AuthToken post_save signal (games.models)
		claim.delete()
		messages.info(request, "You have claimed your account. Nice!")
		influx_metric("hsreplaynet_account_claim", {"count": 1})
		return redirect(self.get_redirect_url(request))


@receiver(social_account_added)
def on_social_account_added(sender, **kwargs):
	request = kwargs.pop("request")
	socialaccount = kwargs["sociallogin"].account
	# Get the user's email address on association
	email = socialaccount.extra_data.get("email", "")
	email_verified = socialaccount.extra_data.get("verified", False)
	if email:
		emailaddress = EmailAddress.objects.add_email(
			request, socialaccount.user, email, confirm=False
		)
		if email_verified:
			# Trust Discord that the email belongs to the user.
			emailaddress.verified = True
			emailaddress.save()
