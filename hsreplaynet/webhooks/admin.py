from django.contrib import admin
from .models import WebhookDelivery, WebhookEndpoint


def send_test_payload(admin, request, queryset):
	for obj in queryset:
		obj.send_test_event()


send_test_payload.short_description = "Send test payload"


def redeliver(admin, request, queryset):
	for obj in queryset:
		obj.deliver(timeout=10)


send_test_payload.short_description = "Redeliver payload"


@admin.register(WebhookEndpoint)
class WebhookEndpointAdmin(admin.ModelAdmin):
	list_display = (
		"__str__", "url", "is_active", "user", "created", "is_deleted",
	)
	list_filter = ("is_active", "is_deleted")
	raw_id_fields = ("user", )
	search_fields = ("uuid", "url", "user__username")
	actions = (send_test_payload, )


@admin.register(WebhookDelivery)
class WebhookDeliveryAdmin(admin.ModelAdmin):
	list_display = (
		"__str__", "uuid", "url", "webhook", "created", "response_status", "success", "completed_time"
	)
	list_filter = ("response_status", "success")
	raw_id_fields = ("webhook", )
