from django.conf import settings
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.staticfiles.templatetags.staticfiles import static
from django.http import Http404
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.generic import View
from .models import GameReplay


class MyReplaysView(LoginRequiredMixin, View):
	template_name = "games/my_replays.html"

	def get(self, request):
		replays = GameReplay.objects.live().filter(user=request.user).count()
		context = {"replays": replays}
		request.head.title = "My Replays"
		return render(request, self.template_name, context)


class ReplayDetailView(View):
	template_name = "games/replay_detail.html"

	def get(self, request, id):
		replay = GameReplay.objects.find_by_short_id(id)
		if not replay:
			raise Http404("Replay not found")

		# TODO: IP caching in redis
		replay.views += 1
		replay.save()

		request.head.set_canonical_url(replay.get_absolute_url())
		description = replay.generate_description()

		twitter_card = request.GET.get("twitter_card", "summary")
		if twitter_card not in ("summary", "player"):
			twitter_card = "summary"

		request.head.title = replay.pretty_name_spoilerfree
		request.head.add_meta(
			{"name": "description", "content": description},
			{"name": "date", "content": replay.global_game.match_start.isoformat()},
			{"property": "og:description", "content": description},
			{"name": "twitter:card", "content": twitter_card},
		)

		request.head.add_stylesheets(
			settings.JOUST_STATIC_URL + "joust.css",
			"fonts/belwefs_extrabold_macroman/stylesheet.css",
			"fonts/franklingothicfs_mediumcondensed_macroman/stylesheet.css",
		)

		if twitter_card == "player":
			thumbnail = request.build_absolute_uri(static("images/joust-thumbnail.png"))
			embed_url = reverse("games_replay_embed", kwargs={"id": replay.shortid})
			request.head.add_meta(
				{"name": "twitter:player", "content": request.build_absolute_uri(embed_url)},
				{"name": "twitter:player:width", "content": 640},
				{"name": "twitter:player:height", "content": 360},
				{"name": "twitter:image", "content": thumbnail},
			)

		context = {
			"replay": replay,
			"players": replay.global_game.players.all(),
		}
		return render(request, self.template_name, context)


class ReplayEmbedView(View):
	template_name = "games/replay_embed.html"

	@xframe_options_exempt
	def get(self, request, id):
		replay = GameReplay.objects.find_by_short_id(id)
		if not replay:
			raise Http404("Replay not found")
		return render(request, self.template_name, {"replay": replay})
