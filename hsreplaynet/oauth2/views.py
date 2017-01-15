from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse_lazy
from django.utils.timezone import now
from django.views.generic import UpdateView, ListView, View
from oauth2_provider.generators import generate_client_secret
from oauth2_provider.models import AccessToken
from oauth2_provider.views import AuthorizationView as BaseAuthorizationView
from allauth.account.views import LoginView
from .models import Application


class OAuth2LoginView(LoginView):
	def get_context_data(self):
		ret = super().get_context_data()
		# Get the client ID, look for a matching client and pass it as context
		client_id = self.request.GET.get("client_id")
		if client_id:
			try:
				ret["oauth2_client"] = Application.objects.get(client_id=client_id)
			except Application.DoesNotExist:
				pass
		return ret


class AuthorizationView(BaseAuthorizationView):
	login_url = reverse_lazy("oauth2_login")

	def get_login_url(self):
		# We override the login URL in order to pass the client_id to it
		client_id = self.request.GET.get("client_id")
		if client_id:
			return self.login_url + "?client_id=%s" % (client_id)
		return super().get_login_url()


class ApplicationBaseView(LoginRequiredMixin, View):
	model = Application

	def get_queryset(self):
		return self.model.objects.filter(user=self.request.user)


class ApplicationUpdateView(ApplicationBaseView, UpdateView):
	template_name = "oauth2/application_update.html"
	fields = ("name", "description", "homepage", "redirect_uris")


class ApplicationListView(ApplicationBaseView, ListView):
	"""
	Mixed view that lists both the authorized apps for the user,
	as well as the application the user *owns*.
	"""
	template_name = "account/oauth_apps.html"

	def get_context_data(self, **kwargs):
		context = super().get_context_data(**kwargs)
		authorized_apps = AccessToken.objects.filter(
			user=self.request.user,
			expires__gt=now(),
		).distinct("application")
		context["authorized_apps"] = authorized_apps
		return context


class ResetSecretView(ApplicationBaseView):
	def post(self, request, **kwargs):
		app = get_object_or_404(self.get_queryset(), pk=kwargs["pk"])
		app.client_secret = generate_client_secret()
		app.save()
		return redirect(app)


class RevokeAllTokensView(ApplicationBaseView):
	def post(self, request, **kwargs):
		app = get_object_or_404(self.get_queryset(), pk=kwargs["pk"])
		app.accesstoken_set.all().delete()
		return redirect(app)


class UserRevocationView(LoginRequiredMixin, View):
	model = Application
	next = reverse_lazy("oauth2_app_list")

	def post(self, request):
		client_id = request.POST.get("client_id")
		if client_id:
			app = get_object_or_404(self.model, client_id=client_id)
			tokens = app.accesstoken_set.filter(user=request.user)
			tokens.delete()
		return redirect(self.next)
