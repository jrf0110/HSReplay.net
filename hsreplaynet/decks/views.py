from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.decorators import method_decorator
from django.views.generic import TemplateView, View
from hearthstone.enums import CardClass
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
		deck_ids = set()
		for replay in GameReplay.objects.live().filter(user=request.user).all():
			deck_ids.add(replay.friendly_deck.id)

		payload = {
			"my_decks": list(deck_ids),
		}

		return JsonResponse(payload)
