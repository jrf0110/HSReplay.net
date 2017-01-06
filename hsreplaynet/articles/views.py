from django.views.generic.detail import DetailView
from django.views.generic.list import ListView
from .models import Article


class ArticleDetailView(DetailView):
	model = Article

	def get_context_data(self, **kwargs):
		context = super().get_context_data(**kwargs)
		context["render_comments"] = True

		return context

	def get_queryset(self):
		qs = super().get_queryset()

		if not self.request.user.is_staff:
			qs = qs.filter(draft=False)

		return qs


class ArticleListView(ListView):
	model = Article
	object_name = "article"

	def get_context_data(self, **kwargs):
		context = super().get_context_data(**kwargs)
		context["render_comments"] = False

		return context

	def get_queryset(self):
		qs = super().get_queryset()
		qs = qs.filter(listed=True)

		if not self.request.user.is_staff:
			qs = qs.filter(draft=False)

		return qs
