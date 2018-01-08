from django.contrib import admin

from . import models


@admin.register(models.CancellationRequest)
class CancellationRequestAdmin(admin.ModelAdmin):
	list_display = ("__str__", "user", "created")
	raw_id_fields = ("user", )


@admin.register(models.LazyDiscount)
class LazyDiscountAdmin(admin.ModelAdmin):
	list_display = ("__str__", "user", "coupon", "used", "created", "updated")
	list_filter = ("used", )
	raw_id_fields = ("user", "referral_source")


@admin.register(models.Referral)
class ReferralAdmin(admin.ModelAdmin):
	list_display = (
		"__str__", "credited_amount", "processed", "credited_user", "hit_user", "created"
	)
	list_filter = ("processed", )
	raw_id_fields = ("referral_hit", "credited_user", "hit_user")


@admin.register(models.ReferralLinkPlan)
class ReferralLinkPlanAdmin(admin.ModelAdmin):
	list_display = ("__str__", "referral_link", "apply_coupon", "coupon_expiry")
	raw_id_fields = ("referral_link", )
