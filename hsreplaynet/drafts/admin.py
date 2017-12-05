from django.contrib import admin

from . import models


@admin.register(models.ArenaDraft)
class ArenaDraftAdmin(admin.ModelAdmin):
	display_list = ("__str__", "pegasus_account", "wins", "losses", "started", "ended")
	raw_id_fields = ("pegasus_account", )


@admin.register(models.ArenaDraft)
class DungeonDraftAdmin(admin.ModelAdmin):
	display_list = ("__str__", "pegasus_account", "wins", "started", "ended")
	raw_id_fields = ("pegasus_account", )
