import random

from allauth.account.models import EmailAddress
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import ObjectDoesNotExist, SuspiciousOperation
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.utils.http import is_safe_url
from django.utils.timezone import now
from django.views.generic import TemplateView, View
from djstripe.settings import STRIPE_LIVE_MODE
from stripe.error import CardError, InvalidRequestError

from hsreplaynet.web.html import RequestMetaMixin


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
		if not customer or not customer.active_subscriptions.exists():
			# Safeguard
			return False

		# We only allow end-of-period cancel if the current subscription is active.
		return customer.active_subscriptions.exists()

	def has_subscription_past_due(self, customer):
		return customer.subscriptions.filter(status="past_due").exists()

	def can_cancel_immediately(self, customer):
		"""
		Returns whether a customer is allowed to cancel immediately.
		"""
		if self.has_subscription_past_due(customer):
			# Can always do an immediate cancel when past due
			return True

		if not customer or not customer.active_subscriptions.exists():
			# Safeguard
			return False

		if STRIPE_DEBUG:
			# In Stripe debug mode, we always allow immediate cancel.
			return True

		# Otherwise, we only allow immediate cancel if the subscription is not active.
		for subscription in customer.active_subscriptions.all():
			if not subscription.is_valid():
				return True

		return False

	def can_remove_payment_methods(self, customer):
		"""
		Returns whether a customer is allowed to remove their payment methods.

		Will always be True if more than one payment method is available.
		Will be False if there is at least one active subscription, which is
		not scheduled to be cancelled.
		"""
		sources_count = customer.legacy_cards.count() + customer.sources_v3.count()
		if sources_count > 1:
			return True

		return not customer.active_subscriptions.filter(
			cancel_at_period_end=False
		).exists()

	def get_context_data(self, **kwargs):
		context = super().get_context_data(**kwargs)

		# Will be None if the user is not authenticated
		customer = self.get_customer()
		context["customer"] = customer

		if customer:
			# `payment_methods` is a queryset of the customer's payment sources
			context["legacy_cards"] = customer.legacy_cards.all()
			context["sources"] = customer.sources_v3.all()
			context["can_cancel"] = self.can_cancel(customer)
			context["can_cancel_immediately"] = self.can_cancel_immediately(customer)
			context["can_remove_payment_methods"] = self.can_remove_payment_methods(customer)
			context["has_subscription_past_due"] = self.has_subscription_past_due(customer)
			try:
				context["latest_invoice"] = customer.invoices.latest("date")
			except ObjectDoesNotExist:
				context["latest_invoice"] = None
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

	def process_elements_checkout_form(self, customer):
		source_id = self.request.POST.get("stripeToken", "")
		if not source_id:
			raise SuspiciousOperation("Missing stripeToken")

		return self.process_legacy_checkout_form(customer)

	def process_legacy_checkout_form(self, customer):
		# The token represents the customer's payment method
		token = self.request.POST.get("stripeToken", "")
		if not token.startswith(("tok_", "src_")):
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
		if customer.valid_subscriptions.exists():
			# The customer is already subscribed

			if customer.valid_subscriptions.count() > 1:
				# The customer is already in an error state -- this should not happen.
				messages.error(
					self.request, "You have multiple subscriptions. Please contact us."
				)
				return False

			subscription = customer.subscription

			if subscription.cancel_at_period_end:
				# The customer's subscription was canceled and is now being re-activated
				try:
					subscription.reactivate()
				except InvalidRequestError:
					# Maybe the subscription already ran out.
					# Sync the subscriptions and display an error.
					customer._sync_subscriptions()
					messages.error(self.request, "Your subscription has expired.")
					return False
				return True

			if subscription.status == "past_due":
				messages.error(
					self.request,
					"Your current subscription is still active. "
					"If you are having billing issues, please contact us!"
				)

			messages.error(self.request, "You are already subscribed!")
			return False

		lazy_discounts = customer.subscriber.lazy_discounts.filter(used=False)
		if lazy_discounts.exists():
			for discount in lazy_discounts:
				discount.apply()

			# Refresh customer
			customer = customer.__class__.objects.get(pk=customer)

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

		token_type = request.POST.get("stripeTokenType", "")
		if token_type == "card":
			self.process_legacy_checkout_form(customer)
		elif token_type == "source":
			self.process_elements_checkout_form(customer)
		elif token_type:
			raise NotImplementedError("Unknown token type: %r" % (token_type))

		if "plan" in request.POST:
			# Optionally, a plan can be specified. We attempt subscribing to it if there is one.
			self.handle_subscribe(customer)

		return redirect(self.get_success_url())


class CancelSubscriptionView(LoginRequiredMixin, PaymentsMixin, View):
	success_url = reverse_lazy("billing_methods")

	def fail(self, message):
		message += " Please contact us if you are receiving this in error."
		messages.error(self.request, message)
		return False

	def handle_form(self, request):
		if self.customer.active_subscriptions.count() > 1:
			return self.fail("You have multiple subscriptions - something is wrong.")

		subscription = self.customer.subscription

		if not subscription:
			# The customer is not subscribed
			return self.fail("You are not subscribed.")

		# Whether the cancellation has effect at the end of the period or immediately
		# True by default (= the subscription remains, will cancel once it ends)
		at_period_end = True

		# Even though both buttons might be shown at once, we will only respect the one
		# that was actually clicked
		how_to_cancel = request.POST.get("cancel")
		if how_to_cancel == "at_period_end":
			pass
		elif how_to_cancel == "immediately":
			if self.can_cancel_immediately(self.customer):
				at_period_end = False
			else:
				return self.fail("Your subscription cannot be canceled immediately.")
		else:
			return self.fail("Could not cancel your subscription.")

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
		if not stripe_id.startswith(("card_", "src_")):
			# The Stripe ID of a card always starts with card_
			# For sources, it's always src_
			return False

		# `customer` is the StripeCustomer instance matching the current user
		customer = request.user.stripe_customer
		legacy_cards = customer.legacy_cards.all()
		sources = customer.sources_v3.all()

		try:
			# Get the payment method matching the stripe id, scoped to the customer
			card = legacy_cards.get(stripe_id=stripe_id)
			source = None
		except ObjectDoesNotExist:
			try:
				source = sources.get(stripe_id=stripe_id)
				card = None
			except ObjectDoesNotExist:
				return False

		if "delete" in request.POST:
			# Delete payment method
			if card:
				card.remove()
			elif source:
				source.detach()

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
			stripe_customer.default_source = stripe_id
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
		"I have no time for games!",
		"Support a small indie company!",
		"Everyone, get in here!",
	]

	def get_context_data(self, **kwargs):
		context = super().get_context_data(**kwargs)
		context["random_quote"] = random.choice(self.quotes)
		return context


class BasePaypalView(View):
	fail_url = reverse_lazy("premium")

	def fail(self, message):
		message = message + " Please contact us if you are seeing this in error."
		messages.error(self.request, message)
		return redirect(self.fail_url)


class PaypalSuccessView(BasePaypalView):
	success_url = reverse_lazy("premium")

	def get(self, request):
		from djpaypal.models import PreparedBillingAgreement

		token = request.GET.get("token", "")
		if not token:
			return self.fail("Unable to complete subscription.")

		try:
			prepared_agreement = PreparedBillingAgreement.objects.get(id=token)
		except PreparedBillingAgreement.DoesNotExist:
			return self.fail("Invalid subscription token.")

		if prepared_agreement.user != self.request.user:
			return self.fail("You are not logged in as the correct user.")

		prepared_agreement.execute()

		messages.info(self.request, "You are now subscribed with Paypal!")
		return redirect(self.success_url)


class PaypalCancelView(BasePaypalView):
	def get(self, request):
		from djpaypal.models import PreparedBillingAgreement
		token = request.GET.get("token", "")
		if token:
			try:
				prepared_agreement = PreparedBillingAgreement.objects.get(id=token)
			except PreparedBillingAgreement.DoesNotExist:
				return self.fail("Invalid token while cancelling payment.")

			prepared_agreement.cancel()

		return self.fail("Your payment was interrupted.")


class PaypalSubscribeView(BasePaypalView):
	def post(self, request):
		from djpaypal.models import BillingPlan
		id = request.POST.get("plan", "")
		if not id:
			return self.fail("Could not determine your plan.")

		try:
			plan = BillingPlan.objects.get(id=id)
		except BillingPlan.DoesNotExist:
			return self.fail("Invalid Paypal plan.")

		# The start date of the plan is equal to a full period of the plan's
		# payment definition after now.
		# This is because the first period is paid as part of the "setup fee".
		# Why? Because in Paypal, the start date can't be "now", it always has
		# to be in the future. Putting it "in a few minutes" makes us prone to
		# race conditions where the API call can fail, or the user can cancel
		# their subscription before the first payment has arrived. On top of
		# this, without a setup fee, Paypal will tell the user that there will
		# be no initial payment, which is misleading.
		start_date = now() + plan.regular_payment_definition.frequency_delta
		override_merchant_preferences = {
			"setup_fee": plan.regular_payment_definition.amount.copy(),
		}

		prepared_agreement = plan.create_agreement(
			request.user, start_date=start_date,
			override_merchant_preferences=override_merchant_preferences
		)

		return redirect(prepared_agreement.approval_url)
