from itertools import chain, permutations
import fakeredis
from hsreplaynet.utils.prediction import DeckPrefixTree


def dbf_list(play_sequences):
	return chain.from_iterable(play_sequences)


DOOMSAYER = 138
BLOODMAGE = 749
LOOTHOARDER = 251
FROSTNOVA = 587
FIREBALL = 315
BLIZZARD = 457
FROSTBOLT = 662


PLAY_SEQUENCES = {
	1: [
		[],
		[LOOTHOARDER],
		[LOOTHOARDER],
		[],
		[FROSTNOVA, DOOMSAYER],
		[BLIZZARD]
	],
	2: [
		[LOOTHOARDER],
		[LOOTHOARDER],
		[FIREBALL],  # We Consider Fireball Not In Deck ID: 2
		[FROSTNOVA, DOOMSAYER],
	]
}

DECK_1 = [LOOTHOARDER, LOOTHOARDER, FROSTNOVA, DOOMSAYER, BLIZZARD]
DECK_2 = [LOOTHOARDER, LOOTHOARDER, FROSTNOVA, DOOMSAYER, FIREBALL]


def test_children():
	r = fakeredis.FakeStrictRedis()
	config = dict(
		use_lua=False,
		include_current_hour=True,
		brute_force_cutoff=1,
		epoch_hour_override=100
	)
	tree = DeckPrefixTree(r, config=config)

	DECK = [LOOTHOARDER, LOOTHOARDER, DOOMSAYER, DOOMSAYER, FROSTBOLT, FROSTBOLT]
	for combo in permutations(DECK, 3):
		play_sequence = []
		for card in combo:
			play_sequence.append([card])
		tree.observe(1, DECK, play_sequence)

	assert r.exists("ROOT_children")
	assert r.exists("ROOT_100")
	assert r.sismember("ROOT_children", LOOTHOARDER)
	assert r.sismember("ROOT_children", FROSTBOLT)
	assert r.sismember("ROOT_children", DOOMSAYER)
	assert r.scard("ROOT_children") == 3

	assert r.exists("ROOT|138_children")
	assert r.exists("ROOT|138_100")
	assert r.sismember("ROOT|138_children", LOOTHOARDER)
	assert r.sismember("ROOT|138_children", FROSTBOLT)
	assert r.sismember("ROOT|138_children", DOOMSAYER)
	assert r.scard("ROOT|138_children") == 3


def test_prefix_tree():
	r = fakeredis.FakeStrictRedis()
	config = dict(use_lua=False, include_current_hour=True, brute_force_trigger=1)
	tree = DeckPrefixTree(r, config=config)

	assert tree.lookup([], []) is None

	tree.observe(1, DECK_1, PLAY_SEQUENCES[1])
	# Lookups against the ROOT node will tell you the global most popular deck
	assert tree.lookup([], [], force=True) == 1

	# Assert all the prefixes of observed game sequences return the expected deck
	for i in range(0, len(PLAY_SEQUENCES[1])):
		play_sequence_prefix = PLAY_SEQUENCES[1][:i]
		expected = 1 if i >= tree.config["minimum_prediction_depth"] else None
		result = tree.lookup(dbf_list(play_sequence_prefix), play_sequence_prefix)
		assert result == expected

	UNOBSERVED_PLAY_SEQUENCE = [
		[],
		[],
		[DOOMSAYER]
	]

	assert tree.lookup(dbf_list(UNOBSERVED_PLAY_SEQUENCE), UNOBSERVED_PLAY_SEQUENCE) is None

	tree.observe(2, DECK_2, PLAY_SEQUENCES[2])

	# Assert the common prefix between the two decks now returns None
	# Since it can't tell which deck is more popular
	for i in range(0, 3):
		play_sequence_prefix = PLAY_SEQUENCES[1][:i]
		result = tree.lookup(dbf_list(play_sequence_prefix), play_sequence_prefix)
		assert result is None

	# Assert that once the prefixes branch each deck is returned
	assert tree.lookup(dbf_list(PLAY_SEQUENCES[1][:4]), PLAY_SEQUENCES[1][:4]) == 1
	assert tree.lookup(dbf_list(PLAY_SEQUENCES[2][:4]), PLAY_SEQUENCES[2][:4]) == 2

	# Now observe deck 1 again to make it more popular
	tree.observe(1, DECK_1, PLAY_SEQUENCES[1])
	assert tree.lookup([], [], force=True) == 1

	# Assert the common prefix now returns 1
	for i in range(0, 3):
		play_sequence_prefix = PLAY_SEQUENCES[1][:i]
		result = tree.lookup(dbf_list(play_sequence_prefix), play_sequence_prefix)
		expected = 1 if i >= tree.config["minimum_prediction_depth"] else None
		assert result == expected

	# Assert 2 is still returned after the common prefix
	assert tree.lookup(dbf_list(PLAY_SEQUENCES[2][:4]), PLAY_SEQUENCES[2][:4]) == 2
