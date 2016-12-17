from django.contrib import admin
from .models import Webhook, WebhookTrigger


def send_test_payload(admin, request, queryset):
	for obj in queryset:
		obj.trigger({"test_data": True})


send_test_payload.short_description = "Send test payload"


@admin.register(Webhook)
class WebhookAdmin(admin.ModelAdmin):
	list_display = (
		"__str__", "url", "is_active", "user", "max_triggers", "created", "is_deleted",
	)
	list_filter = ("is_active", "is_deleted")
	raw_id_fields = ("user", )
	search_fields = ("url", "user", )
	actions = (send_test_payload, )


@admin.register(WebhookTrigger)
class WebhookTriggerAdmin(admin.ModelAdmin):
	list_display = ("id", "url", "webhook", "response_status", "success", "completed_time")
	list_filter = ("response_status", "success")
	raw_id_fields = ("webhook", )
