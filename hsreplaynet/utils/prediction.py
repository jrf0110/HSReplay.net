from copy import copy
from datetime import datetime, timedelta
from math import ceil, floor, pow
from random import randrange
from django.conf import settings
from django.core.cache import caches
from hearthstone.enums import CardClass, FormatType
from hsreplaynet.utils.redis import (
	DEFAULT_TTL,
	RedisIntegerMapStorage,
	RedisPopularityDistribution,
	RedisTree,
	SECONDS_PER_DAY
)


def deck_prediction_tree(player_class, game_format, redis_client=None):
	player_class_enum = CardClass(int(player_class))
	game_format_enum = FormatType(int(game_format))
	if redis_client:
		redis = redis_client
	else:
		redis = caches["decks"].client.get_client()
	return DeckPredictionTree(redis, player_class_enum, game_format_enum)


class PredictionResult:
	def __init__(self, tree, predicted_deck_id, node, tie, match_attempts, sequence):
		self.tree = tree
		self.predicted_deck_id = predicted_deck_id
		self.node = node
		self.tie = tie
		self.match_attempts = match_attempts
		self.play_sequences = sequence
		if node:
			self.popularity_distribution = tree._popularity_distribution(node)
		else:
			self.popularity_distribution = None

	def path(self):
		stack = []
		node = self.node
		while node:
			stack.insert(0, node.label)
			node = node.parent
		return stack


DEFAULT_POPULARITY_TTL = 7 * SECONDS_PER_DAY


class DeckPredictionTree:
	def __init__(
		self,
		redis,
		player_class,
		format,
		max_depth=4,
		ttl=DEFAULT_TTL,
		popularity_ttl=DEFAULT_POPULARITY_TTL,
		include_current_hour=settings.INCLUDE_CURRENT_HOUR_IN_LOOKUP
	):
		self.redis = redis
		self.player_class = player_class
		self.format = format
		self.max_depth = max_depth
		self.ttl = ttl
		self.popularity_ttl = popularity_ttl
		self.include_current_hour = include_current_hour
		self.storage = RedisIntegerMapStorage(redis, "DECK", ttl=self.ttl)
		self.tree_name = "%s_%s_%s" % ("DECK_PREDICTION", player_class.name, format.name)
		self.tree = RedisTree(redis, self.tree_name, ttl=self.ttl)

	def lookup(self, dbf_map, sequence):
		play_sequence = copy(sequence)
		predicted_deck_id, node, tie, match_attempts = self._lookup(dbf_map, play_sequence)
		return PredictionResult(
			self,
			predicted_deck_id,
			node,
			tie,
			match_attempts,
			sequence
		)

	def _lookup(self, dbf_map, play_sequence):
		# Seek to the maximum depth in the tree
		stack = []
		node = self.tree.root

		while node and len(play_sequence):
			stack.insert(0, node)
			next_sequence = play_sequence.pop(0)
			next_node = node.get_child(next_sequence, create=False)
			if next_node:
				node = next_node
		stack.insert(0, node)

		# Then start looking for a match starting from the deepest node
		match_attempts = 0
		while len(stack):
			node = stack.pop(0)
			popularity_dist = self._popularity_distribution(node)

			if self.include_current_hour:
				end_ts = datetime.utcnow()
			else:
				end_ts = datetime.utcnow() - timedelta(hours=1)

			# Do not request more candidates than the maximum amount
			# That our deck storage system supports brute force search over
			# - 1 because distribution(limit=..) is inclusive
			num_candidates = self.storage.max_match_size - 1
			candidate_decks = popularity_dist.distribution(
				end_ts=end_ts,
				limit=num_candidates
			)

			sorted_candidates = sorted(
				candidate_decks.items(),
				key=lambda t: t[1],
				reverse=True
			)
			most_popular = [k for k, v in sorted_candidates]

			matches = self.storage.match(dbf_map, *most_popular)
			match_attempts += 1

			if len(matches) > 1:
				first_match = matches[0]
				first_match_popularity = candidate_decks[first_match]
				second_match = matches[1]
				second_match_popularity = candidate_decks[second_match]

				# If multiple matches have equal popularity then return None
				if first_match_popularity > second_match_popularity:
					return int(first_match), node, False, match_attempts
				else:
					# There is a tie for most popular deck
					if node.depth == 0:
						# We are at the root so we must make a choice.
						top_matches = [first_match, second_match]
						# Get all the decks tied for first place
						for additional_match in matches[2:]:
							if candidate_decks[additional_match] == first_match_popularity:
								top_matches.append(additional_match)
						final_match = top_matches[randrange(0, len(top_matches))]
						return int(final_match), node, False, match_attempts
					else:
						pass
						# We are not at the root, so we pass
						# And let a node higher up the tree decide

			if len(matches) == 1:
				return int(matches[0]), node, False, match_attempts

		return None, None, False, match_attempts

	def observe(self, deck_id, dbf_map, play_sequence, as_of=None):
		self.storage.store(deck_id, dbf_map)
		return self._observe(deck_id, copy(play_sequence), as_of)

	def _observe(self, deck_id, play_sequence, as_of=None):
		node = self.tree.root
		while node and node.depth < self.max_depth:
			popularity_dist = self._popularity_distribution(node)
			popularity_dist.increment(deck_id, as_of=as_of)
			if len(play_sequence):
				next_sequence = play_sequence.pop(0)
				node = node.get_child(next_sequence, create=True)
			else:
				break

	def _popularity_distribution(self, node):
		dist = RedisPopularityDistribution(
			self.redis,
			name=node.key,
			ttl=self.popularity_ttl,
			max_items=self._max_collection_size_for_depth(node.depth)
		)
		return dist

	def _max_collection_size_for_depth(self, depth, min_size=1000.0):
		# Nodes closer to the root retain more deck state
		# Since a greater percentage of the global deck volume flows through them
		# 0 -> min_size * (16 / 2 ** 0) = 16 * min_size
		# 1 -> min_size * (16 / 2 ** 0) = 16 * min_size
		# 2 -> min_size * (16 / 2 ** 1) = 8 * min_size
		# 3 -> min_size * (16 / 2 ** 1) = 8 * min_size
		# 4 -> min_size * (16 / 2 ** 2) = 4 * min_size
		# 5 -> min_size * (16 / 2 ** 2) = 4 * min_size
		# 6 -> min_size * (16 / 2 ** 3) = 2 * min_size
		# 7 -> min_size * (16 / 2 ** 3) = 2 * min_size
		# 8 -> min_size * (16 / 2 ** 4) = 1 * min_size
		# 9+ = min_size
		return int(min_size * ceil(16.0 / pow(2.0, floor(depth / 2.0))))
