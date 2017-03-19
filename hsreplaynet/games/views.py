from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import Http404
from django.shortcuts import render
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.generic import View
from .models import GameReplay


class MyReplaysView(LoginRequiredMixin, View):
	template_name = "games/my_replays.html"

	def get(self, request):
		replays = GameReplay.objects.live().filter(user=request.user).count()
		context = {"replays": replays}
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

		request.canonical_url = replay.get_absolute_url()
		context = {
			"replay": replay,
			"title": replay.pretty_name_spoilerfree,
			"players": replay.global_game.players.all(),
			"twitter_card": request.GET.get("twitter_card", "summary")
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
