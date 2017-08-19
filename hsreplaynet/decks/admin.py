from django.contrib import admin
from .models import (
	Archetype, ArchetypeTrainingDeck, Deck, Include, Signature, SignatureComponent
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


@admin.register(Archetype)
class ArchetypeAdmin(admin.ModelAdmin):
	list_display = ("__str__", "player_class_name", "active_in_wild", "active_in_standard")
	list_filter = ("player_class", )

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

	actions = (
		set_active_in_wild,
		set_inactive_in_wild,
		set_active_in_standard,
		set_inactive_in_standard
	)


@admin.register(ArchetypeTrainingDeck)
class ArchetypeTrainingDeckAdmin(admin.ModelAdmin):
	raw_id_fields = ("deck", )


@admin.register(Signature)
class SignatureAdmin(admin.ModelAdmin):
	list_display = ("__str__", "archetype", "format", "as_of")
	list_filter = ("format", )
	inlines = (SignatureComponentInline, )
