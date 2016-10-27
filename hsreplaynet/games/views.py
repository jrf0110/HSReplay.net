from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import Http404
from django.shortcuts import render
from django.views.generic import View
from django.views.decorators.clickjacking import xframe_options_exempt
from .models import GameReplay, PlayList


class MyReplaysView(LoginRequiredMixin, View):
	def get(self, request):
		replays = GameReplay.objects.live().filter(user=request.user).count()
		context = {"replays": replays}
		return render(request, "games/my_replays.html", context)


class ReplayDetailView(View):
	template_name = "games/replay_detail.html"

	def get_context(self, request, shortid):
		replay = self.get_replay(shortid)
		playlist = self.get_playlist(request.GET.get("playlist", ""))
		players = replay.global_game.players.all()
		players = players.prefetch_related("deck_list", "deck_list__includes")
		baseurl = "%s://%s" % (request.scheme, request.get_host())

		return {
			"replay": replay,
			"playlist": playlist,
			"title": replay.pretty_name_spoilerfree,
			"canonical_url": baseurl + replay.get_absolute_url(),
			"players": players,
			"twitter_card": request.GET.get("twitter_card", "summary"),
		}

	def get_playlist(self, shortid):
		if not shortid:
			return
		try:
			playlist = PlayList.objects.get(shortid=shortid)
		except PlayList.DoesNotExist:
			# We don't want to 404 if the playlist does not exist
			# The replay could still be valid
			playlist = None
		return playlist

	def get_replay(self, shortid):
		replay = GameReplay.objects.find_by_short_id(shortid)
		if not replay:
			raise Http404("Replay not found")

		# Increase view counter on replay
		# TODO: IP caching in redis
		replay.views += 1
		replay.save()
		return replay

	def get(self, request, id):
		context = self.get_context(request, id)
		return render(request, self.template_name, context)


class ReplayEmbedView(View):
	@xframe_options_exempt
	def get(self, request, id):
		replay = GameReplay.objects.find_by_short_id(id)
		if not replay:
			raise Http404("Replay not found")
		return render(request, "games/replay_embed.html", {"replay": replay})
