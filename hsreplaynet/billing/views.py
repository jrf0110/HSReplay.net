from allauth.account.utils import send_email_confirmation
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import SuspiciousOperation
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.views.generic import TemplateView, View
from djstripe.models import Customer, Plan, StripeCard
from stripe.error import InvalidRequestError


class StripeCheckoutMixin:
	def get_customer(self, request):
		if request.user.is_authenticated:
			# The Stripe customer model corresponding to the user
			customer, _ = Customer.get_or_create(request.user)
			return customer

	def get_context_data(self, **kwargs):
		context = super().get_context_data(**kwargs)

		# Will be None if the user is not authenticated
		context["customer"] = self.get_customer(self.request)

		if context["customer"]:
			# `payment_methods` is a queryset of the customer's payment sources
			context["payment_methods"] = context["customer"].sources.all()
		else:
			# When anonymous, the customer is None, thus has no payment methods
			context["payment_methods"] = []

		# `stripe_debug` is set if DEBUG is on *and* we are using a test mode pubkey
		test_mode = settings.STRIPE_PUBLIC_KEY.startswith("pk_test_")
		context["stripe_debug"] = settings.DEBUG and test_mode

		plans = Plan.objects.all()
		# Hardcoding assumptions: exactly 1 monthly and 1 semiannual plan
		context["monthly_plan"] = plans.get(stripe_id=settings.MONTHLY_PLAN_ID)
		context["semiannual_plan"] = plans.get(stripe_id=settings.SEMIANNUAL_PLAN_ID)

		return context

	def process_checkout_form(self, request):
		if request.POST.get("stripeTokenType") != "card":
			# We always expect a card as token.
			raise SuspiciousOperation("Invalid Stripe token type")

		# The token represents the customer's payment method
		token = request.POST.get("stripeToken", "")
		if not token.startswith("tok_"):
			# We either didn't get a token, or it was malformed. Discard outright.
			raise SuspiciousOperation("Invalid Stripe token")

		customer = self.get_customer(request)

		try:
			# Saving the token as a payment method will create the payment source for us.
			customer.add_card(token)
		except InvalidRequestError:
			# Most likely, we got a bad token (eg. bad request)
			# This is logged by Stripe.
			messages.add_message(request, messages.ERROR, "Error adding payment card")
			return False

		# Stripe Checkout supports capturing email.
		# We ask for it if we don't have one yet.
		email = request.POST.get("stripeEmail")
		if email and not request.user.email:
			# So if the user doesn't have an email, we set it to the stripe email.
			request.user.email = email
			request.user.save()
			# Send a confirmation email for email verification
			send_email_confirmation(request, request.user)

		return True

	def post(self, request):
		self.process_checkout_form(request)
		return redirect(self.success_url)


class BillingSettingsView(LoginRequiredMixin, StripeCheckoutMixin, TemplateView):
	template_name = "billing/settings.html"
	success_url = reverse_lazy("billing_methods")


class SubscribeView(LoginRequiredMixin, View):
	success_url = reverse_lazy("billing_methods")

	def handle_form(self, request):
		customer, _ = Customer.get_or_create(request.user)

		if customer.subscription:
			# The customer is already subscribed

			if customer.subscription.cancel_at_period_end:
				# The customer's subscription was canceled and is now being re-activated
				try:
					customer.subscription.reactivate()
				except InvalidRequestError:
					# Maybe the subscription already ran out.
					# Sync the subscriptions and display an error.
					customer._sync_subscriptions()
					messages.add_message(request, messages.ERROR, "Your subscription is no longer valid.")
					return False
				return True

			messages.add_message(request, messages.ERROR, "You are already subscribed!")
			return False

		# The Stripe ID of the plan should be included in the POST
		plan_id = request.POST.get("plan")
		if not plan_id:
			messages.add_message(request, messages.ERROR, "No plan specified. What happened?")
			return False

		try:
			# Attempt to subscribe the customer to the plan
			customer.subscribe(plan_id)
		except InvalidRequestError:
			# Most likely, bad form data. This will be logged by Stripe.
			messages.add_message(request, messages.ERROR, "Could not process subscription.")
			return False

	def post(self, request):
		self.handle_form(request)
		return redirect(self.success_url)


class CancelSubscriptionView(LoginRequiredMixin, View):
	success_url = reverse_lazy("billing_methods")

	def handle_form(self, request):
		customer, _ = Customer.get_or_create(request.user)

		if not customer.subscription:
			# The customer is not subscribed
			messages.add_message(request, messages.ERROR, "You are not subscribed.")
			return False

		try:
			customer.subscription.cancel()
		except InvalidRequestError as e:
			if "No such subscription: " in str(e):
				# The subscription doesn't exist (or was already cancelled)
				# This check should happen in dj-stripe's cancel() method really
				customer._sync_subscriptions()
				return False
			else:
				raise

		return True

	def post(self, request):
		self.handle_form(request)
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


class PremiumDetailView(StripeCheckoutMixin, TemplateView):
	template_name = "premium.html"
	success_url = reverse_lazy("premium")

	def post(self, request):
		success = self.process_checkout_form(request)
		if success:
			return redirect(self.success_url)
