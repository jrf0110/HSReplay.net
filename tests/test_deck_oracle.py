from collections import defaultdict
import fakeredis
from hsreplaynet.utils.prediction import DeckOracle

DECKS = [
	293400890,
	195890218,
	217541170,
	293400890,
	295568375,
	257802957,
	293400890,
	295563405,
	205220289,
	276545408,
	293400890,
	295570345,
	254488571,
	293400890,
	236780877,
	236633405,
	295536848,
	293400890,
	191000104,
	232775758,
	293400890,
	290743468,
	295234169,
	293400890,
	282172342,
]


def test_deck_oracle():
	r = fakeredis.FakeStrictRedis()
	config = dict(use_lua=False, include_current_hour=True, epoch_hour_override=100)
	oracle = DeckOracle(r, "ROOT", config=config)

	actuals = defaultdict(int)
	for deck in DECKS:
		actuals[deck] += 1
		oracle.record(deck)
		config["epoch_hour_override"] += 1

	most_popular = list(sorted(actuals.items(), key=lambda t: t[1], reverse=True))
	assert most_popular[0][0] == oracle.predict()

	assert oracle.deck_count == len(actuals.keys())
