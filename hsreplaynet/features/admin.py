from django.contrib import admin
from .models import Feature


@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
	list_display = ("name", "status", "read_only")
	list_filter = ("status", "read_only", )
