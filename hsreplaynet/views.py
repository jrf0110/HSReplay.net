from django.conf import settings
from django.views.generic import TemplateView
from .games.models import GameReplay
from .utils.html import RequestMetaMixin


SITE_DESCRIPTION = "Watch and share Hearthstone replays directly from your web browser!"


class HomeView(TemplateView):
	template_name = "home.html"

	def get_context_data(self, **kwargs):
		context = super().get_context_data(**kwargs)
		context["featured_replay"] = self.get_featured_replay()

		return context

	def get_featured_replay(self):
		id = getattr(settings, "FEATURED_GAME_ID", None)
		if not id:
			return

		try:
			game = GameReplay.objects.get(shortid=id)
		except GameReplay.DoesNotExist:
			game = None

		return game

	def get(self, request):
		request.head.base_title = ""
		request.head.title = "HSReplay.net: Share your Hearthstone games!"
		request.head.add_meta(
			{"name": "description", "content": SITE_DESCRIPTION},
			{"property": "og:description", "content": SITE_DESCRIPTION},
			{"name": "twitter:card", "content": "summary"},
		)
		return super().get(request)


class DownloadsView(RequestMetaMixin, TemplateView):
	template_name = "downloads.html"
	title = "Downloads"
	stylesheets = (
		settings.FONTAWESOME_CSS_URL,
	)
