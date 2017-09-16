from django.contrib import admin

from .models import Feature, FeatureInvite


@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
	list_display = ("name", "status", "read_only")
	list_filter = ("status", "read_only", )


@admin.register(FeatureInvite)
class FeatureInviteAdmin(admin.ModelAdmin):
	list_display = (
		"__str__", "uuid", "use_count", "use_count", "max_uses", "expires", "created"
	)
	list_filter = ("features", )
	readonly_fields = ("use_count", )
