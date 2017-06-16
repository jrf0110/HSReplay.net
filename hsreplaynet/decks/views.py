from collections import defaultdict
from datetime import timedelta
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import Http404, JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.generic import DetailView, TemplateView, View
from django_hearthstone.cards.models import Card
from hearthstone.enums import CardClass, PlayState
from hsreplaynet.features.decorators import view_requires_feature_access
from hsreplaynet.games.models import GameReplay
from hsreplaynet.utils.html import RequestMetaMixin
from .models import Archetype, Deck


##
# Card pages

class CardStatsView(RequestMetaMixin, TemplateView):
	template_name = "cards/card_stats.html"
	title = "Hearthstone Card Statistics"
	description = "Compare statistics about all collectible Hearthstone cards. "\
		"Find the cards that are played the most or have the highest winrate."


class MyCardStatsView(LoginRequiredMixin, RequestMetaMixin, TemplateView):
	template_name = "cards/my_card_stats.html"
	title = "My Cards"


class CardGalleryView(RequestMetaMixin, TemplateView):
	template_name = "cards/card_gallery.html"
	title = "Hearthstone Card Gallery"
	description = "View all collectible cards in Hearthstone. Filter by cost, rarity, " \
		"set, type, race and mechanics. Examine detailed statistics for any card."


@method_decorator(view_requires_feature_access("cardeditor"), name="dispatch")
class CardEditorView(RequestMetaMixin, TemplateView):
	template_name = "cards/card_editor.html"
	title = "Hearthstone Card Editor"
	stylesheets = (
		"fonts/belwefs_extrabold_macroman/stylesheet.css",
		"fonts/franklingothicfs_mediumcondensed_macroman/stylesheet.css",
	)


class CardDetailView(DetailView):
	model = Card

	def get_object(self, queryset=None):
		if queryset is None:
			queryset = self.get_queryset()

		pk = self.kwargs[self.pk_url_kwarg]
		if pk.isdigit():
			# If it's numeric, filter using the dbf id
			queryset = queryset.filter(dbf_id=pk)
		else:
			# Otherwise, use the card id
			queryset = queryset.filter(id=pk)

		try:
			obj = queryset.get()
		except queryset.model.DoesNotExist:
			raise Http404("No card found matching the query.")

		self.request.head.set_canonical_url(obj.get_absolute_url())
		self.request.head.title = "%s - Hearthstone Card Statistics" % (obj.name)
		self.request.head.opengraph["og:image"] = obj.get_card_art_url()
		self.request.head.opengraph["og:image:width"] = 256
		self.request.head.opengraph["og:image:height"] = 256

		if obj.collectible:
			description = "Statistics about %s, the Hearthstone card. " \
				"Learn which decks we recommend and how it's played." % (obj.name)
			self.request.head.add_meta(
				{"name": "description", "content": description},
				{"property": "og:description", "content": description},
			)

		return obj


##
# Deck pages

class DeckDetailView(View):
	template_name = "decks/deck_detail.html"

	def get(self, request, id):
		try:
			deck = Deck.objects.get_by_shortid(id)
		except Deck.DoesNotExist:
			raise Http404("Deck does not exist.")

		cards = deck.card_dbf_id_list()
		if len(cards) != 30:
			raise Http404("Deck list is too small.")

		request.head.title = str(deck)

		if deck.deck_class:
			deck_url = request.build_absolute_uri(deck.get_absolute_url())
			request.head.add_meta(
				{"property": "x-hearthstone:deck", "content": str(deck)},
				{"property": "x-hearthstone:deck:deckstring", "content": deck.deckstring},
				{"property": "x-hearthstone:deck:hero", "content": deck.hero},
				{"property": "x-hearthstone:deck:cards", "content": ",".join(deck.card_id_list())},
				{"property": "x-hearthstone:deck:url", "content": deck_url},
			)

		self.request.head.add_meta({
			"name": "description",
			"content": (
				"Decklist for this %s. Learn how to play it with our mulligan guide "
				"and find similar decks."
			) % (deck),
		})

		context = {
			"deck": deck,
			"card_list": ",".join(str(id) for id in cards),
		}
		return render(request, self.template_name, context)


class DeckListView(RequestMetaMixin, TemplateView):
	template_name = "decks/deck_list.html"
	title = "Hearthstone Decks"
	description = "Dive into the Hearthstone meta and find new decks by class, cards or " \
		"game mode. Learn about their winrates and popularity on the ladder."


class TrendingDecksView(RequestMetaMixin, TemplateView):
	template_name = "decks/trending.html"
	title = "Trending Hearthstone Decks"
	description = "Find the up-and-coming decks with rising popularity in Hearthstone " \
		"for each class updated every single day."


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

		canonical_deck = archetype.canonical_decks.order_by("-created").first()
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
		deck_lists = dict()
		game_types_for_deck = defaultdict(lambda: defaultdict(int))

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
				"num_turns": num_turns,
				"pretty_name": replay.pretty_name,
				"replay_url": replay.get_absolute_url()
			}

			if replay.friendly_deck.size == 30:
				deck_lists[deck_id] = replay.friendly_deck.as_dbf_json(serialized=False)
				deck_data[deck_id].append(replay_details)
				game_types_for_deck[deck_id][replay.global_game.game_type.name] += 1

		result = {}
		for deck_id, replay_details in deck_data.items():
			total_game_seconds = 0
			game_seconds_denom = 0
			total_num_turns = 0
			game_count = 0
			player_class = None
			total_wins = 0
			replay_urls = []
			for r in replay_details:
				if player_class is None and r["player_class"]:
					player_class = r["player_class"]
				# Converting from game turns to player_turns
				total_num_turns += round(float(r["num_turns"]) / 2)
				game_count += 1
				if r["final_state"] == PlayState.WON:
					total_wins += 1

				if r["game_length_seconds"]:
					game_seconds_denom += 1
					total_game_seconds += r["game_length_seconds"]
				replay_urls.append([r["pretty_name"], r["replay_url"]])

			win_rate = float(total_wins) / game_count
			avg_game_length_seconds = float(total_game_seconds) / game_seconds_denom
			avg_num_turns = float(total_num_turns) / game_count

			result[deck_id] = {
				"deck_id": deck_id,
				"deck_list": deck_lists[deck_id],
				"player_class": player_class,
				"total_games": game_count,
				"win_rate": round(win_rate, 2),
				"avg_game_length_seconds": round(avg_game_length_seconds, 2),
				"avg_num_turns": round(avg_num_turns, 2),
				"replays": replay_urls,
				"game_types": dict(game_types_for_deck[deck_id])
			}

		return JsonResponse(result)
