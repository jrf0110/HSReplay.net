from django.contrib import admin

from .models import Event, Webhook, WebhookDelivery, WebhookEndpoint


def send_test_payload(admin, request, queryset):
	for obj in queryset:
		obj.send_test_event()


send_test_payload.short_description = "Send test payload"


def redeliver(admin, request, queryset):
	for obj in queryset:
		obj.deliver(timeout=10)


redeliver.short_description = "Redeliver payload"


class WebhookInline(admin.StackedInline):
	model = Webhook
	raw_id_fields = ("endpoint", "event")
	extra = 0
	show_change_link = True


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
	list_display = ("__str__", "type", "user", "created", "updated")
	raw_id_fields = ("user", )
	inlines = (WebhookInline, )


@admin.register(WebhookEndpoint)
class WebhookEndpointAdmin(admin.ModelAdmin):
	list_display = (
		"__str__", "url", "is_active", "user", "created", "is_deleted",
	)
	list_filter = ("is_active", "is_deleted")
	raw_id_fields = ("user", )
	search_fields = ("uuid", "url", "user__username")
	actions = (send_test_payload, )


class WebhookDeliveryInline(admin.StackedInline):
	model = WebhookDelivery
	extra = 0
	raw_id_fields = ("webhook", )
	show_change_link = True


@admin.register(Webhook)
class WebhookAdmin(admin.ModelAdmin):
	list_display = (
		"__str__", "endpoint", "url", "event", "status", "created", "updated"
	)
	list_filter = ("status", )
	raw_id_fields = ("endpoint", "event", )
	search_fields = ("url", )
	inlines = (WebhookDeliveryInline, )
	actions = (redeliver, )
