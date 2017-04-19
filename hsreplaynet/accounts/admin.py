from allauth.socialaccount.models import SocialAccount
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from djstripe.models import Customer
from hsreplaynet.admin.paginators import EstimatedCountPaginator
from hsreplaynet.api.admin import AuthToken
from hsreplaynet.games.models import PegasusAccount
from hsreplaynet.utils.admin import admin_urlify as urlify
from .models import AccountClaim, AccountDeleteRequest, User


class AuthTokenInline(admin.TabularInline):
	model = AuthToken
	extra = 0
	fields = ("creation_apikey", "created", "test_data", )
	readonly_fields = ("created", )
	show_change_link = True


class PegasusAccountInline(admin.TabularInline):
	model = PegasusAccount
	extra = 0
	readonly_fields = ("account_hi", "account_lo")
	show_change_link = True


class SocialAccountInline(admin.TabularInline):
	model = SocialAccount
	extra = 0
	readonly_fields = ("provider", "uid", "extra_data")
	show_change_link = True


class StripeCustomerInline(admin.TabularInline):
	model = Customer
	extra = 0
	show_change_link = True
	# raw_id_fields = ("default_source", )
	fields = readonly_fields = (
		"stripe_id", "livemode", "stripe_timestamp", "account_balance", "currency",
		"default_source",
	)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
	change_form_template = "loginas/change_form.html"
	fieldsets = ()
	list_display = (
		"username", "date_joined", "last_login", "is_fake", "default_replay_visibility"
	)
	list_filter = BaseUserAdmin.list_filter + ("is_fake", "default_replay_visibility")
	inlines = (
		SocialAccountInline, PegasusAccountInline, AuthTokenInline, StripeCustomerInline
	)
	ordering = None
	paginator = EstimatedCountPaginator


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
