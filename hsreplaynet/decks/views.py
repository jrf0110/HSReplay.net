from django.http import Http404, JsonResponse
from django.shortcuts import render
from hearthstone.enums import CardClass
from hsreplaynet.cards.archetypes import guess_class
from hsreplaynet.cards.models import Archetype, Deck


def deck_detail(request, deck_id):
	try:
		deck = Deck.objects.get(id=deck_id)
	except Deck.DoesNotExist:
		raise Http404("Deck not found")
	cards = deck.card_id_list()
	if (len(cards)) != 30:
		raise Http404("Deck not found")
	decklist = ",".join(cards)
	deck_class = guess_class(deck)
	return render(
		request,
		"cards/deck_detail.html",
		{"deck": deck, "cards": decklist, "deck_class": deck_class.name}
	)


def deck_list(request):
	return render(request, "cards/deck_discover.html", {})


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
