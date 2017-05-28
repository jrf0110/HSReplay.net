from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.views.generic import CreateView, DeleteView, UpdateView
from hsreplaynet.utils.html import RequestMetaMixin
from .models import WebhookDelivery, WebhookEndpoint


class WebhookFormMixin(LoginRequiredMixin, RequestMetaMixin):
	model = WebhookEndpoint
	template_name = "webhooks/detail.html"
	fields = ["url", "is_active"]
	success_url = reverse_lazy("account_api")


class WebhookCreateView(WebhookFormMixin, CreateView):
	title = "Create a webhook"

	def form_valid(self, form):
		form.instance.creator = self.request.user
		form.instance.user = self.request.user
		return super().form_valid(form)


class WebhookUpdateView(WebhookFormMixin, UpdateView):
	context_object_name = "webhook"
	deliveries_limit = 25
	title = "Update a webhook"

	def get_queryset(self):
		qs = super().get_queryset()
		return qs.filter(user=self.request.user, is_deleted=False)

	def get_context_data(self, **kwargs):
		context = super().get_context_data(**kwargs)
		context["deliveries"] = WebhookDelivery.objects.filter(
			webhook__endpoint=context["webhook"]
		)[:self.deliveries_limit]
		return context


class WebhookDeleteView(WebhookFormMixin, DeleteView):
	def get_queryset(self):
		qs = super().get_queryset()
		return qs.filter(user=self.request.user, is_deleted=False)
