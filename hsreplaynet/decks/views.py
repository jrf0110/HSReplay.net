from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import Http404, JsonResponse
from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.views.generic import DetailView, TemplateView, View
from django_hearthstone.cards.models import Card
from hearthstone.enums import CardClass
from hsreplaynet.features.decorators import view_requires_feature_access
from hsreplaynet.features.models import Feature
from hsreplaynet.utils.html import RequestMetaMixin
from .models import Archetype, Deck


##
# Meta overview pages

@method_decorator(view_requires_feature_access("meta-overview"), name="dispatch")
class MetaOverviewView(LoginRequiredMixin, TemplateView):
	template_name = "meta_overview/meta_overview.html"
	title = "Meta Overview"


##
# Archetype pages

@method_decorator(view_requires_feature_access("archetype-detail"), name="dispatch")
class ArchetypeDetailView(LoginRequiredMixin, View):
	template_name = "archetypes/archetype_detail.html"
	title = "Archetype"

	def get(self, request, id, slug):
		try:
			archetype = Archetype.objects.get_by_id(id)
		except Archetype.DoesNotExist:
			raise Http404("Archetype does not exist.")

		request.head.title = archetype.name

		context = {
			"archetype": archetype
		}

		return render(request, self.template_name, context)


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
			queryset = queryset.filter(card_id=pk)

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

		try:
			feature = Feature.objects.get(name="archetype-detail")
		except Feature.DoesNotExist:
			has_feature = False
		else:
			has_feature = feature.enabled_for_user(request.user)

		request.head.title = "%s Deck" % str(deck.archetype) if has_feature else str(deck)

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


@method_decorator(view_requires_feature_access("my-decks"), name="dispatch")
class MyDecksView(LoginRequiredMixin, RequestMetaMixin, TemplateView):
	template_name = "decks/my_decks.html"
	title = "My Decks"


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
