import random
from allauth.account.models import EmailAddress
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import ObjectDoesNotExist, SuspiciousOperation
from django.http import HttpResponse
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.utils.http import is_safe_url
from django.views.generic import TemplateView, View
from djstripe.settings import STRIPE_LIVE_MODE
from stripe.error import CardError, InvalidRequestError
from hsreplaynet.utils.html import RequestMetaMixin


STRIPE_DEBUG = not STRIPE_LIVE_MODE and settings.DEBUG


class PaymentsMixin:
	def get_customer(self):
		"""
		Returns the user's Stripe customer object, or None for logged out users.
		"""
		if self.request.user.is_authenticated:
			return self.request.user.stripe_customer

	def can_cancel(self, customer):
		"""
		Return whether a customer is allowed to cancel (at end of period).
		"""
		if not customer or not customer.subscription:
			# Safeguard
			return False

		# We only allow end-of-period cancel if the current subscription is active.
		return customer.subscription.is_valid()

	def can_cancel_immediately(self, customer):
		"""
		Returns whether a customer is allowed to cancel immediately.
		"""
		if not customer or not customer.subscription:
			# Safeguard
			return False

		if STRIPE_DEBUG:
			# In Stripe debug mode, we always allow immediate cancel.
			return True

		# Otherwise, we only allow immediate cancel if the subscription is not active.
		return not customer.subscription.is_valid()

	def can_remove_payment_methods(self, customer):
		"""
		Returns whether a customer is allowed to remove their payment methods.

		Will always be True if more than one payment method is available.
		Will be False if there is at least one active subscription, which is
		not scheduled to be cancelled.
		"""
		if customer.sources.count() > 1:
			return True

		for subscription in customer.subscriptions.all():
			if not subscription.cancel_at_period_end:
				return False

		return True

	def get_context_data(self, **kwargs):
		context = super().get_context_data(**kwargs)

		# Will be None if the user is not authenticated
		customer = self.get_customer()
		context["customer"] = customer

		if customer:
			# `payment_methods` is a queryset of the customer's payment sources
			context["payment_methods"] = customer.sources.all()
			context["can_cancel"] = self.can_cancel(customer)
			context["can_cancel_immediately"] = self.can_cancel_immediately(customer)
			context["can_remove_payment_methods"] = self.can_remove_payment_methods(customer)
		else:
			# When anonymous, the customer is None, thus has no payment methods
			context["payment_methods"] = []

		return context


class BillingView(LoginRequiredMixin, RequestMetaMixin, PaymentsMixin, TemplateView):
	template_name = "billing/settings.html"
	success_url = reverse_lazy("billing_methods")
	title = "Billing"


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
			messages.error(self.request, "Error adding payment card")
			return False
		except CardError:
			# Card was declined.
			messages.error(self.request, "Your card was declined. Please use a different card.")
			return False

		# Stripe Checkout supports capturing email.
		# We ask for it if we don't have one yet.
		email = self.request.POST.get("stripeEmail")
		if email and not self.request.user.email:
			# So if the user doesn't have an email, we set it to the stripe email.
			# First we attach the email as an EmailAddress to the account
			# confirm=True will send an email confirmation
			EmailAddress.objects.add_email(
				self.request, self.request.user, email, confirm=True
			)
			# Then we set it on the account object itself
			self.request.user.email = email
			self.request.user.save()

		# Let's attach the email we got to the Stripe customer object as well
		email = email or self.request.user.email
		if email:
			# Retrieve the Stripe customer object from the API
			cus = customer.api_retrieve()
			# We skip the API call if it's a noop
			if cus.email != email:
				cus.email = email
				# Write the results to the API
				cus.save()

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
					messages.error(self.request, "Your subscription has expired.")
					return False
				return True

			messages.error(self.request, "You are already subscribed!")
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
			messages.error(self.request, "Could not process subscription.")
			return False
		except CardError as e:
			return self.handle_card_error(e)

		if customer.coupon:
			# HACK: If the customer has a coupon attached and the coupon is
			# now redeemed, a customer.discount webhook does not fire.
			# We force a customer resync to prevent this.
			data = customer.api_retrieve()
			customer.__class__.sync_from_stripe_data(data)

		return True

	def handle_card_error(self, e):
		if e.code in ("do_not_honor", "transaction_not_allowed"):
			# Generic unknown decline reason
			message = "Your card declined the charge. Please contact your bank for information."
		elif e.code == "currency_not_supported":
			message = "Your card does not support payments in USD. Please try a different card."
		elif e.code == "card_velocity_exceeded":
			message = "Your card has exceeded its credit limit. Please use a different one."
		elif e.code == "insufficient_funds":
			message = "Your card has insufficient funds to proceed."
		else:
			# Card was declined for some other reason
			message = (
				"Your card was declined, you have not been charged. "
				"Please try a different card; contact us if this persists."
			)
		messages.error(self.request, message)
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


class CancelSubscriptionView(LoginRequiredMixin, PaymentsMixin, View):
	success_url = reverse_lazy("billing_methods")

	def handle_form(self, request):
		if not self.customer.subscription:
			# The customer is not subscribed
			messages.error(request, "You are not subscribed.")
			return False

		# Whether the cancellation has effect at the end of the period or immediately
		# True by default (= the subscription remains, will cancel once it ends)
		at_period_end = True

		if request.POST.get("immediate") == "on":
			if self.can_cancel_immediately(self.customer):
				at_period_end = False
			else:
				messages.error(
					"Your subscription cannot be canceled immediately."
					"Please contact us if you are receiving this in error."
				)

		self.customer.subscription.cancel(at_period_end=at_period_end)
		return True

	def post(self, request):
		self.customer = self.get_customer()
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
		customer = request.user.stripe_customer
		sources = customer.sources.all()
		try:
			# Get the payment method matching the stripe id, scoped to the customer
			card = sources.get(stripe_id=stripe_id)
		except ObjectDoesNotExist:
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
			try:
				stripe_customer.save()
			except InvalidRequestError:
				messages.error(self.request, "Could not update default card.")
				# This may happen if the card does not exist (attempt to save
				# a default card that does not exist). Resync the customer's cards.
				customer._sync_cards()
			else:
				customer.__class__.sync_from_stripe_data(stripe_customer)

		return True

	def post(self, request):
		self.handle_form(request)
		return redirect(self.success_url)


class PremiumDetailView(RequestMetaMixin, TemplateView):
	template_name = "premium/premium_detail.html"
	title = "HearthSim Premium"
	description = "More filters, more features, more data: Gain access to advanced " \
		"Hearthstone statistics backed by millions of games with HearthSim Premium " \
		"for HSReplay.net."

	quotes = [
		"It only cost my soul!",
		"Mind if I roll Need?",
		"I hope you like my invention!",
		"Who knows what secrets we'll uncover?",
		"You require my assistance?",
		"Don't worry love, the cavalry's here!",
		"Put your faith in the stats.",
		"The gates are open!",
		"Are you ready for this?",
		"Join, or die (or both)!",
		"D-d-don't touch that!",
		"Wanna blow somethin' up?",
		"I have no time for games!"
	]

	def get_context_data(self, **kwargs):
		context = super().get_context_data(**kwargs)
		context["random_quote"] = random.choice(self.quotes)
		return context


class PaypalSuccessView(View):
	success_url = reverse_lazy("premium")

	def get(self, request):
		from djpaypal.models import PreparedBillingAgreement
		token = request.GET.get("token", "")
		assert token, "Missing token!"
		prepared_agreement = PreparedBillingAgreement.objects.get(id=token)
		if prepared_agreement.user != self.request.user:
			messages.error(
				self.request,
				"You are not logged in as the correct user. "
				"Please contact us if you are seeing this in error."
			)
			return redirect(self.success_url)

		prepared_agreement.execute()

		return HttpResponse("Billing agreement executed! You are now subscribed using Paypal.")


class PaypalCancelView(View):
	success_url = reverse_lazy("premium")

	def get(self, request):
		messages.error(
			self.request,
			"Your payment was interrupted. "
			"Please contact us if you are seeing this in error."
		)
		return redirect(self.success_url)


class PaypalSubscribeView(View):
	fail_url = reverse_lazy("premium")

	def fail(self, request):
		messages.error(
			self.request,
			"Could not determine your plan. "
			"Please contact us if you are seeing this in error."
		)
		return redirect(self.fail_url)

	def post(self, request):
		from djpaypal.models import BillingPlan
		id = request.POST.get("plan", "")
		if not id:
			return self.fail()

		try:
			plan = BillingPlan.objects.get(id=id)
		except BillingPlan.DoesNotExist:
			return self.fail()

		prepared_agreement = plan.create_agreement(request.user)
		return redirect(prepared_agreement.approval_url)
