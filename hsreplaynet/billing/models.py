from datetime import timedelta
from uuid import uuid4

from django.conf import settings
from django.contrib.postgres.fields import JSONField
from django.db import models, transaction
from django.utils import timezone


class CancellationRequest(models.Model):
	user = models.ForeignKey(
		settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
		related_name="cancellation_requests"
	)
	subscription_id = models.CharField(max_length=255)
	reasons = JSONField()

	created = models.DateTimeField(auto_now_add=True)
	updated = models.DateTimeField(auto_now=True)


class LazyDiscount(models.Model):
	"""
	A coupon discount that is applied to a user without being tracked in Stripe.
	This discount allows for an expiration date individual to the user.
	"""
	user = models.ForeignKey(
		settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
		related_name="lazy_discounts"
	)
	coupon = models.ForeignKey("djstripe.Coupon", on_delete=models.CASCADE)
	referral_source = models.OneToOneField(
		"billing.Referral", on_delete=models.CASCADE, unique=True
	)
	expires = models.DateTimeField(null=True)
	used = models.BooleanField(default=False)
	idempotency_key = models.UUIDField(
		unique=True, default=uuid4, editable=False,
		help_text="Idempotency key to be used when applying the coupon."
	)

	created = models.DateTimeField(auto_now_add=True)
	updated = models.DateTimeField(auto_now=True)

	def apply(self):
		if self.expires and self.expires > timezone.now():
			# Discount expired. Delete it instead.
			self.delete()
			return False

		if self.used:
			# Discount has already been used. Skip.
			return False

		with transaction.atomic():
			self.user.stripe_customer.add_coupon(
				self.coupon, idempotency_key=self.idempotency_key
			)
			self.used = True
			self.save()

		return True


class Referral(models.Model):
	referral_hit = models.ForeignKey(
		"django_reflinks.ReferralHit", on_delete=models.PROTECT,
	)
	credited_amount = models.PositiveIntegerField(
		help_text="The amount credited to the user's balance (in cents)."
	)
	credit_request_id = models.CharField(
		max_length=255, blank=True, db_index=True,
		help_text="The Stripe Request-Id for the balance credit."
	)

	processed = models.BooleanField(default=False)
	credited_user = models.ForeignKey(
		settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="referrals"
	)
	hit_user = models.OneToOneField(
		settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
	)

	created = models.DateTimeField(auto_now_add=True)
	updated = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f"{self.hit_user} referred by {self.referral_hit}"

	def apply_referral_plan(self):
		try:
			plan = ReferralLinkPlan.objects.get(referral_link=self.referral_hit.referral_link)
		except ReferralLinkPlan.DoesNotExist:
			# No plan associated with the link
			return

		if not plan.apply_coupon:
			# No coupon to apply
			return

		if plan.coupon_expiry:
			expires = timezone.now() + timedelta(days=plan.coupon_expiry)
		else:
			expires = None

		LazyDiscount.objects.get_or_create(referral_source=self, defaults={
			"user": self.hit_user,
			"coupon": plan.apply_coupon,
			"expires": expires,
		})


class ReferralLinkPlan(models.Model):
	referral_link = models.OneToOneField(
		"django_reflinks.ReferralLink", on_delete=models.CASCADE,
		related_name="plan"
	)
	apply_coupon = models.CharField(max_length=255, blank=True)
	coupon_expiry = models.PositiveIntegerField(default=0)

	created = models.DateTimeField(auto_now_add=True)
	updated = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f"Referral Plan for {self.referral_link}"
