from collections import defaultdict
from copy import copy


class DeckOracle:
	"""
	A deck oracle for the given node within the prefix tree.
	"""
	MAX_COLLECTION_SIZE = 1000

	def __init__(self, redis, key):
		self.redis = redis
		self.k = key

	def record(self, deck_id):
		self.redis.lpush(self.k, deck_id)
		self.redis.ltrim(self.k, 0, self.MAX_COLLECTION_SIZE)

	def predict(self):
		popularity = defaultdict(int)
		for deck_id in self.redis.lrange(self.k, 0, self.MAX_COLLECTION_SIZE):
			popularity[deck_id] += 1

		most_popular = list(sorted(popularity.items(), key=lambda t: t[1], reverse=True))
		if not most_popular:
			return None

		if len(most_popular) > 1:
			if most_popular[0][1] == most_popular[1][1]:
				return None
			else:
				return int(most_popular[0][0])
		elif len(most_popular) == 1:
			return int(most_popular[0][0])
		else:
			return None


class DeckPrefixTree:

	def __init__(self, redis, oracle_factory=DeckOracle):
		self.redis = redis
		self.oracle_factory = oracle_factory
		self.root = TreeNode(None, self.redis, 0, None, self.oracle_factory)

	def observe(self, deck_id, play_sequences):
		return self.root.observe(deck_id, copy(play_sequences))

	def lookup(self, play_sequences):
		return self.root.lookup(copy(play_sequences))


class TreeNode:

	def __init__(self, parent, redis, depth, play_sequence, oracle_factory):
		self.parent = parent
		self.redis = redis
		self.depth = depth
		self.play_sequence = play_sequence
		self.oracle_factory = oracle_factory
		self.key = self.make_key()
		self.oracle = oracle_factory(self.redis, self.key)

	def make_key(self):
		prefix = self.parent.key + "|" if self.parent else ""
		if self.play_sequence is not None:
			suffix = ",".join(map(str, sorted(self.play_sequence)))
		else:
			suffix = "ROOT"
		return prefix + suffix

	def get_child(self, play_sequence):
		t = TreeNode(self, self.redis, self.depth + 1, play_sequence, self.oracle_factory)
		return t

	def observe(self, deck_id, play_sequences):
		self.oracle.record(deck_id)
		if len(play_sequences):
			next_play_sequence = play_sequences.pop(0)
			node = self.get_child(next_play_sequence)
			return node.observe(deck_id, play_sequences)

	def lookup(self, play_sequences):
		if len(play_sequences):
			next_play_sequence = play_sequences.pop(0)
			node = self.get_child(next_play_sequence)
			return node.lookup(play_sequences)
		else:
			return self.oracle.predict()
