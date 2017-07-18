from copy import copy


class DeckOracle:
	# TODO: This should use a ForgetTable pattern to age out old observations
	# http://word.bitly.com/post/41284219720/forget-table
	# https://github.com/bitly/forgettable/blob/master/pyforget/distribution.py

	# TODO: This should use SpaceSaver to enforce fixed space usage
	# https://www.eventbrite.com/engineering/heavy-hitters-in-redis/

	def __init__(self, redis, key):
		self.redis = redis
		self.key = key

	def record(self, deck_id):
		self.redis.zincrby(self.key, str(deck_id))

	def predict(self):
		most_popular = self.redis.zrevrange(self.key, 0, 1, withscores=True)
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
			suffix = ",".join(map(str,self.play_sequence))
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


class MockRedis:

	def __init__(self):
		self.keys = {}

	def zincrby(self, key, val):
		if key not in self.keys:
			self.keys[key] = {}
		if val not in self.keys[key]:
			self.keys[key][val] = 0

		self.keys[key][val] += 1

	def zrevrange(self, key, min, max, withscores=True):
		if key not in self.keys:
			return None

		values = self.keys[key].items()
		most_popular = list(sorted(values, key=lambda t: t[1], reverse=True))
		if withscores:
			return most_popular[min:max+1]
		else:
			return [k for k,v in most_popular[min:max+1]]
