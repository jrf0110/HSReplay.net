from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import UpdateView, ListView
from oauth2_provider.models import Application


class ApplicationUpdateView(LoginRequiredMixin, UpdateView):
	model = Application
	template_name = "oauth2/application_update.html"
	fields = ("name", "redirect_uris")


class ApplicationListView(LoginRequiredMixin, ListView):
	model = Application
	template_name = "oauth2/application_list.html"

	def get_queryset(self):
		qs = super().get_queryset()
		return qs.filter(user=self.request.user)
