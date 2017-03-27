from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import Http404, HttpResponseBadRequest, JsonResponse
from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.views.generic import DetailView, TemplateView
from hsreplaynet.features.decorators import view_requires_feature_access
from hsreplaynet.utils.html import StylesheetMixin
from .models import Archetype, Card
from .queries import CardCountersQueryBuilder
from .stats.winrates import get_head_to_head_winrates


class ArchetypesView(TemplateView):
	template_name = "cards/deck_archetypes.html"


@method_decorator(view_requires_feature_access("carddb"), name="dispatch")
class CardStatsView(TemplateView):
	template_name = "cards/card_stats.html"


@method_decorator(view_requires_feature_access("carddb"), name="dispatch")
class MyCardStatsView(LoginRequiredMixin, TemplateView):
	template_name = "cards/my_card_stats.html"


@method_decorator(view_requires_feature_access("carddb"), name="dispatch")
class CardGalleryView(TemplateView):
	template_name = "cards/card_gallery.html"


@method_decorator(view_requires_feature_access("cardeditor"), name="dispatch")
class CardEditorView(StylesheetMixin, TemplateView):
	template_name = "cards/card_editor.html"
	stylesheets = (
		"fonts/belwefs_extrabold_macroman/stylesheet.css",
		"fonts/franklingothicfs_mediumcondensed_macroman/stylesheet.css",
	)


@method_decorator(view_requires_feature_access("carddb"), name="dispatch")
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

		return obj


@login_required
@view_requires_feature_access("winrates")
def winrates(request):
	lookback = request.GET.get("lookback", "7")
	offset = request.GET.get("offset", "1")
	regions_param = request.GET.get("regions", "")
	if not regions_param:
		regions = ",".join((
			"144115193835963207",
			"144115198130930503",
			"144115202425897799",
			"144115211015832391")
		)
	else:
		regions = regions_param

	archetypes_param = request.GET.get("archetypes", "")
	if not archetypes_param:
		archetypes = ",".join([str(a.id) for a in Archetype.objects.all()])
	else:
		archetypes = archetypes_param

	game_types = request.GET.get("game_types", "2")
	max_rank = request.GET.get("max_rank", "25")
	min_rank = request.GET.get("min_rank", "-1")
	win_rates, frequencies, expected_winrates = get_head_to_head_winrates(
		lookback,
		offset,
		game_types,
		regions,
		min_rank,
		max_rank,
		archetypes
	)

	payload = {
		"win_rates": win_rates,
		"frequencies": frequencies,
		"expected_winrates": expected_winrates
	}

	return JsonResponse(payload)


@login_required
@view_requires_feature_access("winrates")
def counters(request):
	query_builder = CardCountersQueryBuilder()
	context = {}

	cards_param = request.GET.get("cards", "")
	if not cards_param:
		return HttpResponseBadRequest("A 'cards' query parameter is required.")

	card_names = [c.strip('"') for c in cards_param.split(",")]
	cards = []
	for name in card_names:
		card = Card.objects.get_by_partial_name(name)
		if card:
			cards.append(card)
		else:
			return HttpResponseBadRequest("Unknown card '%s'" % name)

	context["cards"] = cards
	query_builder.cards = context["cards"]

	columns, counters_by_match_count = query_builder.result()

	context["counter_deck_columns"] = columns
	context["counters_by_match_count"] = counters_by_match_count

	return render(request, "cards/deck_counters.html", context)
