from allauth.account.views import LoginView as BaseLoginView
from allauth.socialaccount.models import SocialAccount
from django.conf import settings
from django.contrib import messages
from django.contrib.auth import logout
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import HttpResponseForbidden
from django.shortcuts import redirect, render
from django.urls import reverse_lazy
from django.utils.http import is_safe_url
from django.views.generic import TemplateView, UpdateView, View
from hsreplaynet.games.models import GameReplay
from hsreplaynet.utils import get_uuid_object_or_404, log
from hsreplaynet.utils.html import RequestMetaMixin
from hsreplaynet.utils.influx import influx_metric
from .models import AccountClaim, AccountDeleteRequest, User


class LoginView(BaseLoginView):
	def get(self, request):
		request.head.title = "Sign in"
		return super().get(request)


class EditAccountView(LoginRequiredMixin, RequestMetaMixin, UpdateView):
	template_name = "account/edit.html"
	model = User
	fields = [
		"default_replay_visibility", "joust_autoplay", "locale", "exclude_from_statistics"
	]
	success_url = "/account/"
	title = "Account settings"

	def get_object(self, queryset=None):
		return self.request.user


class APIAccountView(LoginRequiredMixin, RequestMetaMixin, View):
	template_name = "account/api.html"
	title = "API access"

	def get(self, request):
		context = {
			"tokens": request.user.auth_tokens.all(),
			"webhooks": request.user.webhooks.filter(is_deleted=False),
		}
		return render(request, self.template_name, context)


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


class DeleteAccountView(LoginRequiredMixin, RequestMetaMixin, TemplateView):
	template_name = "account/delete.html"
	success_url = reverse_lazy("home")
	title = "Delete account"

	def can_delete(self):
		customer = self.request.user.stripe_customer
		subscriptions = customer.active_subscriptions.filter(cancel_at_period_end=False)
		if subscriptions.count():
			# If the user has any active subscriptions that they did not cancel,
			# we prevent them from deleting their account in order to ensure
			# they confirm the cancellation of their subscription.
			return False
		return True

	def get_context_data(self, **kwargs):
		context = super().get_context_data(**kwargs)
		context["can_delete"] = self.can_delete()
		return context

	def post(self, request):
		if not request.POST.get("delete_confirm"):
			return redirect("account_delete")
		delete_request, _ = AccountDeleteRequest.objects.get_or_create(user=request.user)
		delete_request.reason = request.POST.get("delete_reason")
		delete_request.delete_replay_data = bool(request.POST.get("delete_replays"))
		delete_request.save()
		logout(self.request)
		return redirect(self.success_url)


class MakePrimaryView(LoginRequiredMixin, View):
	success_url = reverse_lazy("socialaccount_connections")

	def post(self, request):
		self.request = request

		account = request.POST.get("account")
		try:
			socacc = SocialAccount.objects.get(id=account)
		except SocialAccount.DoesNotExist:
			return self.error(1)
		if socacc.user != request.user:
			# return HttpResponseForbidden("%r does not belong to you." % (socacc))
			return self.error(2)

		if socacc.provider != "battlenet":
			raise NotImplementedError("Making non-battlenet account primary is not implemented")

		battletag = socacc.extra_data.get("battletag")
		if battletag:
			if User.objects.filter(username=battletag).exists():
				# A user with that username already exists
				return self.error(3)
			request.user.battletag = battletag
			request.user.username = battletag
			request.user.save()

		return self.complete()

	def error(self, id):
		log.warning("%r got error %r when making account primary" % (self.request.user, id))
		influx_metric("hsreplaynet_make_primary", {"count": 1}, error=id)
		messages.error(self.request, "Could not make account primary.")
		return redirect(self.success_url)

	def complete(self, success=True):
		influx_metric("hsreplaynet_make_primary", {"count": 1})
		return redirect(self.success_url)
