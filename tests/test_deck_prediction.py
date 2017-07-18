import fakeredis
from hsreplaynet.utils.prediction import DeckPrefixTree


DOOMSAYER = 138
BLOODMAGE = 749
LOOTHOARDER = 251
FROSTNOVA = 587
FIREBALL = 315
BLIZZARD = 457


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
		[],
		[LOOTHOARDER],
		[LOOTHOARDER],
		[FIREBALL],  # We Consider Fireball Not In Deck ID: 2
		[FROSTNOVA, DOOMSAYER],
	]
}


def test_prefix_tree():
	redis = fakeredis.FakeStrictRedis()
	tree = DeckPrefixTree(redis)
	assert tree.lookup([]) is None

	tree.observe(1, PLAY_SEQUENCES[1])
	# Lookups against the ROOT node will tell you the global most popular deck
	assert tree.lookup([]) == 1

	# Assert all the prefixes of observed game sequences return the expected deck
	for i in range(0, len(PLAY_SEQUENCES[1])):
		play_sequence_prefix = PLAY_SEQUENCES[1][:i]
		result = tree.lookup(play_sequence_prefix)
		assert result == 1

	UNOBSERVED_PLAY_SEQUENCE = [
		[],
		[],
		[DOOMSAYER]
	]

	assert tree.lookup(UNOBSERVED_PLAY_SEQUENCE) is None

	tree.observe(2, PLAY_SEQUENCES[2])

	# Assert the common prefix between the two decks now returns None
	# Since it can't tell which deck is more popular
	for i in range(0, 3):
		play_sequence_prefix = PLAY_SEQUENCES[1][:i]
		result = tree.lookup(play_sequence_prefix)
		assert result is None

	# Assert that once the prefixes branch each deck is returned
	assert tree.lookup(PLAY_SEQUENCES[1][:4]) == 1
	assert tree.lookup(PLAY_SEQUENCES[2][:4]) == 2

	# Now observe deck 1 again to make it more popular
	tree.observe(1, PLAY_SEQUENCES[1])
	assert tree.lookup([]) == 1

	# Assert the common prefix now returns 1
	for i in range(0, 3):
		play_sequence_prefix = PLAY_SEQUENCES[1][:i]
		result = tree.lookup(play_sequence_prefix)
		assert result == 1

	# Assert 2 is still returned after the common prefix
	assert tree.lookup(PLAY_SEQUENCES[2][:4]) == 2
