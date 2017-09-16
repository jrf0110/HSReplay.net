from django.contrib import admin

from .models import Article


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
	list_display = (
		"__str__", "author", "draft", "listed", "created", "updated",
	)
	list_filter = ("draft", "listed")
	raw_id_fields = ("author", )
	search_fields = ("title", )

	prepopulated_fields = {"slug": ("title", )}
