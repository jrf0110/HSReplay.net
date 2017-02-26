from allauth.account.utils import send_email_confirmation
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import SuspiciousOperation
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.utils.http import is_safe_url
from django.views.generic import TemplateView, View
from djstripe.models import Customer, StripeCard
from stripe.error import CardError, InvalidRequestError


STRIPE_DEBUG = settings.STRIPE_PUBLIC_KEY.startswith("pk_test_") and settings.DEBUG


class PaymentsMixin:
	def get_customer(self):
		if self.request.user.is_authenticated:
			# The Stripe customer model corresponding to the user
			customer, _ = Customer.get_or_create(self.request.user)
			return customer

	def get_context_data(self, **kwargs):
		context = super().get_context_data(**kwargs)

		# Will be None if the user is not authenticated
		context["customer"] = self.get_customer()

		if context["customer"]:
			# `payment_methods` is a queryset of the customer's payment sources
			context["payment_methods"] = context["customer"].sources.all()
		else:
			# When anonymous, the customer is None, thus has no payment methods
			context["payment_methods"] = []

		# `stripe_debug` is set if DEBUG is on *and* we are using a test mode pubkey
		context["stripe_debug"] = STRIPE_DEBUG

		return context


class BillingSettingsView(LoginRequiredMixin, PaymentsMixin, TemplateView):
	template_name = "billing/settings.html"
	success_url = reverse_lazy("billing_methods")


class SubscribeView(LoginRequiredMixin, PaymentsMixin, View):
	success_url = reverse_lazy("billing_methods")

	def process_checkout_form(self, customer):
		if self.request.POST.get("stripeTokenType") != "card":
			# We always expect a card as token.
			raise SuspiciousOperation("Invalid Stripe token type")

		# The token represents the customer's payment method
		token = self.request.POST.get("stripeToken", "")
		if not token.startswith("tok_"):
			# We either didn't get a token, or it was malformed. Discard outright.
			raise SuspiciousOperation("Invalid Stripe token")

		try:
			# Saving the token as a payment method will create the payment source for us.
			customer.add_card(token)
		except InvalidRequestError:
			# Most likely, we got a bad token (eg. bad request)
			# This is logged by Stripe.
			messages.add_message(self.request, messages.ERROR, "Error adding payment card")
			return False

		# Stripe Checkout supports capturing email.
		# We ask for it if we don't have one yet.
		email = self.request.POST.get("stripeEmail")
		if email and not self.request.user.email:
			# So if the user doesn't have an email, we set it to the stripe email.
			self.request.user.email = email
			self.request.user.save()
			# Send a confirmation email for email verification
			send_email_confirmation(self.request, self.request.user)

		return True

	def handle_subscribe(self, customer):
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
					messages.add_message(self.request, messages.ERROR, "Your subscription has expired.")
					return False
				return True

			messages.add_message(self.request, messages.ERROR, "You are already subscribed!")
			return False

		# The Stripe ID of the plan should be included in the POST
		plan_id = self.request.POST.get("plan")
		# Have to check that it's a plan that users can subscribe to.
		if plan_id not in (settings.MONTHLY_PLAN_ID, settings.SEMIANNUAL_PLAN_ID):
			raise SuspiciousOperation("Invalid plan ID (%r)" % (plan_id))

		try:
			# Attempt to subscribe the customer to the plan
			customer.subscribe(plan_id)
		except InvalidRequestError:
			# Most likely, bad form data. This will be logged by Stripe.
			messages.add_message(self.request, messages.ERROR, "Could not process subscription.")
			return False
		except CardError:
			# Card was declined for some reason
			messages.error(self.request, "Your card was declined. You have not been charged.")
			return False

	def get_success_url(self):
		success_url = self.request.GET.get("next", "")
		if success_url and is_safe_url(success_url):
			return success_url
		return self.success_url

	def post(self, request):
		self.request = request
		# Get the customer first so we can reuse it
		customer = self.get_customer()

		if "stripeTokenType" in request.POST:
			# If there is a stripe token in the form, that means the user added a card.
			# We need to add the card first, before attempting to subscribe.
			self.process_checkout_form(customer)

		if "plan" in request.POST:
			# Optionally, a plan can be specified. We attempt subscribing to it if there is one.
			self.handle_subscribe(customer)

		return redirect(self.get_success_url())


class CancelSubscriptionView(LoginRequiredMixin, View):
	success_url = reverse_lazy("billing_methods")

	def handle_form(self, request):
		customer, _ = Customer.get_or_create(request.user)

		if not customer.subscription:
			# The customer is not subscribed
			messages.add_message(request, messages.ERROR, "You are not subscribed.")
			return False

		# Whether the cancellation has effect at the end of the period or immediately
		# True by default (= the subscription remains, will cancel once it ends)
		at_period_end = True

		if STRIPE_DEBUG and request.POST.get("immediate", "") == "on":
			# in STRIPE_DEBUG mode only, we allow immediate cancellation
			at_period_end = False

		try:
			customer.subscription.cancel(at_period_end=at_period_end)
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


class PremiumDetailView(TemplateView):
	template_name = "premium.html"
