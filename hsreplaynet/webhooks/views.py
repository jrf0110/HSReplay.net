from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.views.generic import CreateView, DeleteView, UpdateView
from .models import Webhook


class WebhookFormView(LoginRequiredMixin):
	model = Webhook
	template_name = "webhooks/detail.html"
	fields = ["url", "secret", "is_active"]
	success_url = reverse_lazy("account_api")


class WebhookCreateView(WebhookFormView, CreateView):
	def form_valid(self, form):
		form.instance.creator = self.request.user
		form.instance.user = self.request.user
		return super().form_valid(form)


class WebhookUpdateView(WebhookFormView, UpdateView):
	context_object_name = "webhook"
	triggers_limit = 25

	def get_queryset(self):
		qs = super().get_queryset()
		return qs.filter(user=self.request.user, is_deleted=False)

	def get_context_data(self, **kwargs):
		context = super().get_context_data(**kwargs)
		context["triggers"] = context["webhook"].triggers.all()[:self.triggers_limit]
		return context


class WebhookDeleteView(WebhookFormView, DeleteView):
	def get_queryset(self):
		qs = super().get_queryset()
		return qs.filter(user=self.request.user, is_deleted=False)
