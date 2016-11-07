from uuid import uuid4
from django.urls import reverse_lazy
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import CreateView
from .models import Webhook


class WebhookCreateView(LoginRequiredMixin, CreateView):
	template_name = "webhooks/detail.html"
	model = Webhook
	fields = ["url", "is_active"]
	success_url = reverse_lazy("account_api")

	def form_valid(self, form):
		form.instance.uuid = uuid4()
		form.instance.creator = self.request.user
		form.instance.user = self.request.user
		return super().form_valid(form)
