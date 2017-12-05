from django.conf import settings
from django.db import models


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
