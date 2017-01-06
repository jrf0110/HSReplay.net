from django.contrib import admin
from django.db.models import TextField
from markdownx.widgets import AdminMarkdownxWidget
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

	formfield_overrides = {
		# Use markdown editor for TextField (contents)
		TextField: {"widget": AdminMarkdownxWidget},
	}
