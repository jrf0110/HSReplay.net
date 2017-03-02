from collections import defaultdict
from datetime import timedelta
from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.views.generic import TemplateView, View
from hearthstone.enums import CardClass, PlayState
from hsreplaynet.cards.archetypes import guess_class
from hsreplaynet.cards.models import Archetype, Deck
from hsreplaynet.features.decorators import view_requires_feature_access
from hsreplaynet.games.models import GameReplay


@method_decorator(view_requires_feature_access("carddb"), name="dispatch")
class DeckDetailView(View):
	template_name = "decks/deck_detail.html"

	def get(self, request, id):
		deck = get_object_or_404(Deck, id=id)
		cards = deck.card_dbf_id_list()
		if len(cards) != 30:
			raise Http404("Invalid deck")

		context = {
			"deck": deck,
			"card_list": ",".join(str(id) for id in cards),
			"deck_class": guess_class(deck).name,
		}

		return render(request, self.template_name, context)


@method_decorator(view_requires_feature_access("carddb"), name="dispatch")
class DeckListView(TemplateView):
	template_name = "decks/deck_list.html"


@method_decorator(view_requires_feature_access("carddb"), name="dispatch")
class DeckSpotlightView(TemplateView):
	template_name = "decks/deck_spotlight.html"


def canonical_decks(request):
	result = []
	archetypes = Archetype.objects.prefetch_related(
		"canonical_decks__deck__includes"
	).all()
	for archetype in archetypes:
		record = {
			"name": archetype.name,
			"archetype_id": archetype.id,
			"player_class_id": archetype.player_class,
			"player_class_name": CardClass(archetype.player_class).name
		}

		canonical_deck = archetype.canonical_decks.order_by('-created').first()
		if canonical_deck:
			record["representative_deck"] = {
				"card_ids": canonical_deck.deck.card_id_list(),
				"digest": canonical_deck.deck.digest
			}

		result.append(record)

	return JsonResponse(result, safe=False)


class MyDeckIDsView(LoginRequiredMixin, View):
	def get(self, request):
		time_horizon = timezone.now() - timedelta(days=30)
		qs = GameReplay.objects.live().filter(
			user=request.user
		).filter(
			global_game__match_start__gte=time_horizon
		)

		deck_data = defaultdict(list)
		for replay in qs.all():
			friendly_player = replay.friendly_player
			player_class = friendly_player.hero.card_class.name
			final_state = friendly_player.final_state
			global_game = replay.global_game
			if global_game.match_end and global_game.match_start:
				game_duration = global_game.match_end - global_game.match_start
				game_length_seconds = game_duration.total_seconds()
			else:
				game_length_seconds = 0

			num_turns = global_game.num_turns
			deck_id = replay.friendly_deck.id
			replay_details = {
				"final_state": final_state,
				"game_length_seconds": game_length_seconds,
				"player_class": player_class,
				"num_turns": num_turns
			}

			if replay.friendly_deck.size == 30:
				deck_data[deck_id].append(replay_details)

		result = {}
		for deck_id, replay_details in deck_data.items():
			total_game_seconds = 0
			game_seconds_denom = 0
			total_num_turns = 0
			game_count = 0
			player_class = None
			total_wins = 0
			for r in replay_details:
				if player_class is None and r["player_class"]:
					player_class = r["player_class"]
				total_num_turns += r["num_turns"]
				game_count += 1
				if r["final_state"] == PlayState.WON:
					total_wins += 1

				if r["game_length_seconds"]:
					game_seconds_denom += 1
					total_game_seconds += r["game_length_seconds"]

			win_rate = float(total_wins) / game_count
			avg_game_length_seconds = float(total_game_seconds) / game_seconds_denom
			avg_num_turns = float(total_num_turns) / game_count

			result[deck_id] = {
				"deck_id": deck_id,
				"player_class": player_class,
				"total_games": game_count,
				"win_rate": round(win_rate, 2),
				"avg_game_length_seconds": round(avg_game_length_seconds, 2),
				"avg_num_turns": round(avg_num_turns, 2)
			}

		return JsonResponse(result, json_dumps_params=dict(indent=4))
