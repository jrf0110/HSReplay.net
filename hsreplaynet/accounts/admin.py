from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from hsreplaynet.api.admin import AuthToken
from hsreplaynet.utils.admin import admin_urlify as urlify
from .models import AccountClaim, AccountDeleteRequest, User


class AuthTokenInline(admin.TabularInline):
	model = AuthToken
	extra = 0
	show_change_link = True


@admin.register(User)
class UserAdmin(BaseUserAdmin):
	change_form_template = "loginas/change_form.html"
	fieldsets = ()
	list_display = (
		"username", "date_joined", "last_login", "is_fake", "default_replay_visibility"
	)
	list_filter = BaseUserAdmin.list_filter + ("is_fake", "default_replay_visibility")
	inlines = (AuthTokenInline, )


@admin.register(AccountClaim)
class AccountClaimAdmin(admin.ModelAdmin):
	list_display = ("__str__", "created", urlify("token"), urlify("api_key"))
	list_filter = ("api_key", )
	raw_id_fields = ("token", )
	readonly_fields = ("created", )


def process_delete_request(admin, request, queryset):
	for obj in queryset:
		obj.process()
	queryset.delete()


process_delete_request.short_description = "Process selected delete requests"


@admin.register(AccountDeleteRequest)
class AccountDeleteRequestAdmin(admin.ModelAdmin):
	def last_login(self):
		return self.user.last_login
	last_login.short_description = "User's last login"

	def token_count(self):
		return self.user.auth_tokens.count()

	def replay_count(self):
		return self.user.replays.count()

	actions = (process_delete_request, )
	list_display = (
		"__str__", "user", "delete_replay_data", "created", "updated",
		last_login, token_count, replay_count
	)
	list_filter = ("delete_replay_data", )
	date_hierarchy = "created"
	raw_id_fields = ("user", )
	search_fields = ("user__username", "reason")
