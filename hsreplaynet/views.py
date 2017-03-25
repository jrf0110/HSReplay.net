from django.views.generic import TemplateView


class HomeView(TemplateView):
	template_name = "home.html"


class DownloadsView(TemplateView):
	template_name = "downloads.html"
