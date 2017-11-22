from decimal import Decimal

from django.utils.http import is_safe_url
from django.contrib.auth.models import Group
from django.db import models
from django.dispatch.dispatcher import receiver
from django.urls import reverse
from django.utils.timezone import now
from django_intenum import IntEnumField


# Possible idea: middleware that redirects appropriately
# /games/replay/skjfhskdhfk!sdfh?ref=day9tv
# -> /ref/day9tv/?next=/games/replay/.../

class ReferralLink(models.Model):
	shortid = ShortUUIDField("Short ID")
	vanity_name = models.CharField(blank=True, unique=True)
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
	disabled = models.BooleanField(default=False)
	# referral_expiration = models.DurationField(...) ?

	created = models.DateTimeField(auto_now_add=True)
	updated = models.DateTimeField(auto_now=True)

	def get_absolute_url(self):
		return "/ref/{}".format(self.vanity_name or self.shortid)

	def hit(self, request):
		user = request.user if request.user.is_authenticated else None
		set_cookie()
		ip = None  # TODO: confirm get good ip from middleware
		ua = request.META.get("HTTP_USER_AGENT", "")
		hit = ReferralHit.objects.create(
			referral_link=self, hit_user=user, hit_ip=ip, hit_user_agent=ua
		)

		return hit

	def get_credit_amount(self, referral_hit):
		return Decimal("5.00")


class ReferralHit(models.Model):
	referral_link = models.ForeignKey(ReferralLink, on_delete=models.CASCADE)
	hit_user = models.ForeignKey(
		settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True
	)
	ip = models.IPAddressField(help_text="IP address at hit time")
	user_agent = models.TextField(help_text="UA at hit time")

	created = models.DateTimeField(auto_now_add=True)
	updated = models.DateTimeField(auto_now=True)


class ConfirmedReferral(models.Model):
	credit = models.PositiveIntegerField()
	referral_hit = models.ForeignKey(ReferralHit, on_delete=models.CASCADE)
	referred_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
	ip = models.IPAddressField(help_text="IP address at subscription time")
	user_agent = models.TextField(help_text="UA at subscription time")

	created = models.DateTimeField(auto_now_add=True)
	updated = models.DateTimeField(auto_now=True)

# - need better landing page for premium


"""
Your referrals:
	Name	Credited amount		When
	{ref.user}	{ref.credit}	{ref.created}
	{ref.user}	{ref.credit}	{ref.created}
	{ref.user}	{ref.credit}	{ref.created}
"""


class ReferralView(View):
	success_url = "/premium/"

	def get(self, request, id):
		try:
			ref_link = ReferralLink.objects.find(
				Q(shortid=id) | Q(vanity_name=id)
			).first()
		except ReferralLink.DoesNotExist:
			# metrics.send("broken_referral", ...)
			return redirect(self.get_success_url())

		ref_link.hit(request)

		return redirect(self.get_success_url())

	def get_success_url(self):
		success_url = self.request.GET.get("next", "")
		if success_url and is_safe_url(success_url):
			return success_url
		return self.success_url



# XXX: make this a webhook actually -- dont wanna make it part of billing.
@djstripe_webhooks.handler("customer.subscription.created")
def on_subscribe(self):
	# find latest, best referralhit, within alloted timestamp
	referring_user = referral_hit.referral_link.user
	amount_to_credit = referral_hit.referral_link.get_credit_amount(referral_hit)

	# create a ConfirmedReferral
	with transaction.atomic():
		ref = ConfirmedReferral.objects.create(credit=int(amount_to_credit) * 100)
		referring_user.stripe_customer.account_balance += amount_to_credit
		referring_user.stripe_customer.save()

