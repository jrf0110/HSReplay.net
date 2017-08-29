from django.contrib import admin
from hearthsim_identity.utils import admin_urlify
from .models import (
	Archetype, ArchetypeTrainingDeck, ClassClusterSnapshot, ClusterSetSnapshot,
	ClusterSnapshot, ClusterSnapshotMember, Deck, Include, Signature,
	SignatureComponent
)


class IncludeInline(admin.TabularInline):
	model = Include
	raw_id_fields = ("card", )
	extra = 15


class SignatureComponentInline(admin.TabularInline):
	model = SignatureComponent
	raw_id_fields = ("card", )


@admin.register(Deck)
class DeckAdmin(admin.ModelAdmin):
	list_display = ("__str__", "archetype", "created")
	inlines = (IncludeInline, )
	readonly_fields = ("shortid", )
	raw_id_fields = ("guessed_full_deck", )

	def get_ordering(self, request):
		return ["-id"]


@admin.register(ClusterSetSnapshot)
class ClusterSetSnapshotAdmin(admin.ModelAdmin):
	list_display = (
		"__str__",
		"as_of",
		"game_format",
		"latest",
		"live_in_production"
	)


@admin.register(ClassClusterSnapshot)
class ClassClusterSnapshotAdmin(admin.ModelAdmin):
	list_display = (
		"__str__",
		"cluster_set",
		"player_class",
	)
	list_filter = (
		"cluster_set__live_in_production",
		"cluster_set__latest",
		"cluster_set__game_format"
	)


@admin.register(ClusterSnapshot)
class ClusterSnapshotAdmin(admin.ModelAdmin):
	list_display = (
		"id",
		"cluster_id",
		"experimental",
		"pretty_signature_html",
		admin_urlify("archetype"),
		"name",
		"rules"
	)
	list_filter = (
		"class_cluster__cluster_set__latest",
		"class_cluster__cluster_set__live_in_production",
		"class_cluster__cluster_set__game_format",
		"class_cluster__player_class",
	)
	readonly_fields = ("pretty_signature_html",)


@admin.register(ClusterSnapshotMember)
class ClusterSnapshotMemberAdmin(admin.ModelAdmin):
	list_display = (
		"id",
		"cluster",
		"card_list",
		"shortid",
		"observations",
		"win_rate",
		"x",
		"y"
	)


@admin.register(Archetype)
class ArchetypeAdmin(admin.ModelAdmin):
	list_display = (
		"__str__",
		"player_class_name",
		"active_in_wild",
		"active_in_standard",
		"standard_signature_pretty",
		"wild_signature_pretty",
		"wild_signature_as_of",
		"standard_signature_as_of"
	)
	list_filter = ("player_class", )
	readonly_fields = ("standard_signature_pretty", "wild_signature_pretty")

	def get_queryset(self, request):
		qs = super().get_queryset(request)
		return qs.filter(deleted=False)

	def player_class_name(self, obj):
		return "%s" % obj.player_class.name
	player_class_name.short_description = "Class"
	player_class_name.admin_order_field = "player_class"

	def get_ordering(self, request):
		return ["player_class", "name"]

	def set_active_in_wild(self, request, queryset):
		queryset.update(active_in_wild=True)

	def set_active_in_standard(self, request, queryset):
		queryset.update(active_in_standard=True)

	def set_inactive_in_wild(self, request, queryset):
		queryset.update(active_in_wild=False)

	def set_inactive_in_standard(self, request, queryset):
		queryset.update(active_in_standard=False)

	def set_deleted(self, request, queryset):
		queryset.update(deleted=True)

	actions = (
		set_active_in_wild,
		set_inactive_in_wild,
		set_active_in_standard,
		set_inactive_in_standard,
		set_deleted
	)


@admin.register(ArchetypeTrainingDeck)
class ArchetypeTrainingDeckAdmin(admin.ModelAdmin):
	raw_id_fields = ("deck", )


@admin.register(Signature)
class SignatureAdmin(admin.ModelAdmin):
	list_display = ("__str__", "archetype", "format", "as_of")
	list_filter = ("format", )
	raw_id_fields = ("archetype", )
	inlines = (SignatureComponentInline, )
