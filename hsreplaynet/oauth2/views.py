from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404, redirect
from django.views.generic import UpdateView, ListView, View
from oauth2_provider.generators import generate_client_secret
from .models import Application


class ApplicationBaseView(LoginRequiredMixin, View):
	model = Application

	def get_queryset(self):
		return self.model.objects.filter(user=self.request.user)


class ApplicationUpdateView(ApplicationBaseView, UpdateView):
	template_name = "oauth2/application_update.html"
	fields = ("name", "homepage", "redirect_uris")


class ApplicationListView(ApplicationBaseView, ListView):
	template_name = "oauth2/application_list.html"


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
