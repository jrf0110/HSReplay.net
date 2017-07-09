from django.contrib import admin
from .models import Archetype, Deck, Include


class IncludeInline(admin.TabularInline):
	model = Include
	raw_id_fields = ("card", )
	extra = 15


@admin.register(Deck)
class DeckAdmin(admin.ModelAdmin):
	list_display = ("__str__", "archetype", "created")
	inlines = (IncludeInline, )
	readonly_fields = ("shortid", )

	def get_ordering(self, request):
		return ["-id"]


@admin.register(Archetype)
class ArchetypeAdmin(admin.ModelAdmin):
	list_display = ("__str__", "player_class_name")
	list_filter = ("player_class",)

	def player_class_name(self, obj):
		return "%s" % obj.player_class.name
	player_class_name.short_description = "Class"
	player_class_name.admin_order_field = "player_class"

	def get_ordering(self, request):
		return ["player_class", "name"]
