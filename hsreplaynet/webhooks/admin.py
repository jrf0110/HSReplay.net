from django.contrib import admin
from .models import Webhook, WebhookTrigger


@admin.register(Webhook)
class WebhookAdmin(admin.ModelAdmin):
	list_display = (
		"__str__", "url", "is_active", "user", "max_triggers", "created"
	)
	list_filter = ("is_active", "is_deleted")
	raw_id_fields = ("user", )
	search_fields = ("url", "user", )


@admin.register(WebhookTrigger)
class WebhookTriggerAdmin(admin.ModelAdmin):
	list_display = ("id", "url", "webhook", "response_status", "success", "completed_time")
	list_filter = ("response_status", "success")
	raw_id_fields = ("webhook", )
