from django.conf import settings
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import SuspiciousOperation
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.views.generic import TemplateView, View
from djstripe.models import Customer, StripeCard


class BillingSettingsView(LoginRequiredMixin, TemplateView):
	template_name = "billing/settings.html"
	success_url = reverse_lazy("billing_methods")

	def get_context_data(self, **kwargs):
		context = super().get_context_data(**kwargs)

		# `customer` is the Stripe customer model corresponding to the user
		context["customer"], _ = Customer.get_or_create(self.request.user)
		# `payment_methods` is a queryset of the customer's payment sources
		context["payment_methods"] = context["customer"].sources.all()
		# `stripe_debug` is set if DEBUG is on *and* we are using a test mode pubkey
		test_mode = settings.STRIPE_PUBLIC_KEY.startswith("pk_test_")
		context["stripe_debug"] = settings.DEBUG and test_mode
		return context

	def post(self, request):
		if request.POST.get("stripeTokenType") != "card":
			# We always expect a card as token.
			raise SuspiciousOperation("Invalid Stripe token type")

		customer, _ = Customer.get_or_create(request.user)

		token = request.POST.get("stripeToken", "")
		if not token.startswith("tok_"):
			# We either didn't get a token, or it was malformed. Discard outright.
			raise SuspiciousOperation("Invalid Stripe token")

		# TODO: catch bad token
		customer.add_card(token)

		# Stripe Checkout supports capturing email.
		# We ask for it if we don't have one yet.
		email = request.POST.get("stripeEmail")
		if email and not request.user.email:
			# So if the user doesn't have an email, we set it to the stripe email.
			request.user.email = email
			request.user.save()
			# TODO: update emailaddress_set and send email confirmation (allauth)

		return redirect(self.success_url)


class UpdateCardView(LoginRequiredMixin, View):
	success_url = reverse_lazy("billing_methods")

	def handle_form(self, request):
		stripe_id = request.POST.get("stripe_id", "")
		if not stripe_id.startswith("card_"):
			# The Stripe ID of a card always starts with card_
			return False

		# `customer` is the StripeCustomer instance matching the current user
		customer, _ = Customer.get_or_create(request.user)
		sources = customer.sources.all()
		try:
			# Get the payment method matching the stripe id, scoped to the customer
			card = sources.get(stripe_id=stripe_id)
		except StripeCard.DoesNotExist:
			return False

		if "delete" in request.POST:
			# Delete payment method
			card.remove()

			# If the default card is deleted, Stripe will automatically choose
			# a new default. A webhook will trigger to let us know that.
			# However, that data won't be ready in time for the response.
			# If we absolutely need to show the correct default, uncomment the
			# next two lines - but this will significantly slow down pageload.
			# stripe_customer = customer.api_retrieve()
			# Customer.sync_from_stripe_data(stripe_customer)

		elif "set_default" in request.POST:
			# Set the default payment method
			stripe_customer = customer.api_retrieve()
			stripe_customer.default_source = card.stripe_id
			stripe_customer.save()
			Customer.sync_from_stripe_data(stripe_customer)

		return True

	def post(self, request):
		self.handle_form(request)
		return redirect(self.success_url)
