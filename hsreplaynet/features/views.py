from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.forms import CharField, Form, TextInput, ValidationError
from django.urls import reverse_lazy
from django.views.generic import FormView
from .models import FeatureInvite


class FeatureInviteForm(Form):
	uuid = CharField(label="Code", required=True, widget=TextInput(attrs={"size": 40}))

	def clean_uuid(self):
		try:
			feature = FeatureInvite.objects.get(uuid=self.cleaned_data["uuid"])
		except (ValueError, FeatureInvite.DoesNotExist):
			raise ValidationError("This code is not valid.")
		return feature.uuid


class FeatureInviteRedeemView(LoginRequiredMixin, FormView):
	template_name = "features/redeem.html"
	form_class = FeatureInviteForm
	success_url = reverse_lazy("feature_invite_redeem")

	def get_initial(self):
		initial = super().get_initial()
		if "code" in self.request.GET:
			initial["uuid"] = self.request.GET["code"][:40]

		return initial

	def form_valid(self, form):
		invite = FeatureInvite.objects.get(uuid=form.cleaned_data["uuid"])
		invite.redeem_for_user(self.request.user)
		messages.info(self.request, "Code successfully redeemed.")
		return super().form_valid(form)
