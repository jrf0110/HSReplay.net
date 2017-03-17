from django.contrib import admin
from hsreplaynet.admin.paginators import EstimatedCountPaginator
from hsreplaynet.utils.admin import admin_urlify as urlify, set_user
from .models import APIKey, AuthToken


@admin.register(AuthToken)
class AuthTokenAdmin(admin.ModelAdmin):
	actions = (set_user, )
	date_hierarchy = "created"
	list_display = ("__str__", "user", "created", urlify("creation_apikey"), "test_data")
	list_filter = ("test_data", )
	raw_id_fields = ("user", )
	search_fields = ("key", "user__username")
	show_full_result_count = False
	paginator = EstimatedCountPaginator


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
	list_display = ("__str__", "email", "website", "api_key", "enabled", "token_count")
	search_fields = ("full_name", "email", "website")
	list_filter = ("enabled", )
	exclude = ("tokens", )
	readonly_fields = ("api_key", )
	show_full_result_count = False
	paginator = EstimatedCountPaginator

	def token_count(self, obj):
		return obj.tokens.count()
