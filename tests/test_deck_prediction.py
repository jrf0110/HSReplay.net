from itertools import chain
import fakeredis
from hearthstone.enums import CardClass, FormatType
from hsreplaynet.utils.prediction import DeckPredictionTree


DOOMSAYER = 138
BLOODMAGE = 749
LOOTHOARDER = 251
FROSTNOVA = 587
FIREBALL = 315
BLIZZARD = 457
FROSTBOLT = 662


PLAY_SEQUENCES = {
	1: [
		[LOOTHOARDER],
		[LOOTHOARDER],
		[FROSTBOLT],
		[FROSTNOVA, DOOMSAYER],
	],
	2: [
		[LOOTHOARDER],
		[LOOTHOARDER],
		[FIREBALL],
		[FROSTNOVA, DOOMSAYER],
	]
}

DECK_1 = [LOOTHOARDER, LOOTHOARDER, FROSTBOLT, FROSTBOLT, FROSTNOVA, DOOMSAYER]
DECK_2 = [LOOTHOARDER, LOOTHOARDER, FIREBALL, FIREBALL, FROSTNOVA, DOOMSAYER]


def dbf_list(play_sequences):
	return chain.from_iterable(play_sequences)


def to_dbf_map(dbf_list):
	result = {}
	for dbf in dbf_list:
		if dbf not in result:
			result[dbf] = 0
		result[dbf] += 1
	return result


def test_prediction_tree():
	r = fakeredis.FakeStrictRedis()
	tree = DeckPredictionTree(r, CardClass.DRUID, FormatType.FT_STANDARD)
	assert tree.tree_name == "DECK_PREDICTION_DRUID_FT_STANDARD"

	assert tree.lookup({}, []).predicted_deck_id is None

	tree.observe(1, to_dbf_map(DECK_1), PLAY_SEQUENCES[1])
	lookup_result_1 = tree.lookup(
		to_dbf_map(dbf_list(PLAY_SEQUENCES[1])),
		PLAY_SEQUENCES[1][:-1]
	).predicted_deck_id
	assert lookup_result_1 == 1

	tree.observe(2, to_dbf_map(DECK_2), PLAY_SEQUENCES[2])
	lookup_result_2 = tree.lookup(
		to_dbf_map(dbf_list(PLAY_SEQUENCES[2])),
		PLAY_SEQUENCES[2][:-1]
	)
	assert lookup_result_2.predicted_deck_id == 2

	# Assert proper formatting for detailed metrics
	assert lookup_result_2.pretty_node_label() == "ROOT->[Loot Hoarder]->[Loot Hoarder]"
	expected_pretty_play_sequence = "[Loot Hoarder]->[Loot Hoarder]->[Fireball]"
	actual_pretty_play_sequence = lookup_result_2.pretty_play_sequence()
	assert actual_pretty_play_sequence == expected_pretty_play_sequence

	# Check that a popularity tie results in None
	lookup_result_3 = tree.lookup(
		to_dbf_map(dbf_list(PLAY_SEQUENCES[2][:1])),
		PLAY_SEQUENCES[2][:1]
	).predicted_deck_id
	assert lookup_result_3 is None

	# Add an observation to break the tie
	tree.observe(2, to_dbf_map(DECK_2), PLAY_SEQUENCES[2])
	lookup_result_4 = tree.lookup(
		to_dbf_map(dbf_list(PLAY_SEQUENCES[2][:1])),
		PLAY_SEQUENCES[2][:1]
	).predicted_deck_id
	assert lookup_result_4 == 2

	# Check that an unobserved play sequence returns None
	UNOBSERVED_PLAY_SEQUENCE = [
		[BLIZZARD]
	]
	lookup_result_5 = tree.lookup(
		to_dbf_map(dbf_list(UNOBSERVED_PLAY_SEQUENCE)),
		UNOBSERVED_PLAY_SEQUENCE
	).predicted_deck_id
	assert lookup_result_5 is None
