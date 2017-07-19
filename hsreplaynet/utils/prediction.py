import time
from collections import defaultdict
from copy import copy
from math import ceil, floor, pow
from hsreplaynet.utils.influx import influx_metric


SECONDS_PER_HOUR = 3600
# We use the Last 14 days in the front end, so age out decks
# After 15 days to be safe
CACHE_TTL = 15 * 24 * SECONDS_PER_HOUR


class DeckOracle:
	# Based on https://www.eventbrite.com/engineering/heavy-hitters-in-redis/
	INCREMENT_SCRIPT = """
		local myset = ARGV[1]
		local mykey = ARGV[3]
		local set_length = tonumber(ARGV[2])
		local exp_ts = tonumber(ARGV[4])

		if redis.call('ZRANK', myset, mykey) then
			redis.call('ZINCRBY', myset, 1.0, mykey)
		elseif redis.call('ZCARD', myset) < set_length then
			redis.call('ZADD', myset, 1.0, mykey)
		else
			local value = redis.call('ZRANGE', myset, 0, 0, 'withscores')
			redis.call('ZREM', myset, value[1])
			redis.call('ZADD', myset, value[2] + 1.0, mykey)
		end

		redis.call('EXPIREAT', myset, exp_ts)
	"""

	def __init__(self, redis, key_prefix, depth=0, config=None):
		self.redis = redis
		self.depth = depth
		self.prefix = key_prefix

		self.config = config if config else {}
		# Set the default values if not provided
		self.config.setdefault("ttl_hours", 48)
		self.config.setdefault("use_lua", True)
		self.config.setdefault("include_current_hour", False)
		self.config.setdefault("epoch_hour_override", None)

		self.observation_ttl_hours = self.config["ttl_hours"]

		if self.config["use_lua"]:
			self.increment = self.redis.register_script(self.INCREMENT_SCRIPT)

	def increment(self, args):
		# This is usually overridden in production
		# But is implemented to support testing with FakeRedis
		myset = args[0]
		mykey = str(args[2])
		set_length = int(args[1])
		exp_ts = int(args[3])

		if self.redis.zrank(myset, mykey) is not None:
			self.redis.zincrby(myset, mykey, 1.0)
		elif self.redis.zcard(myset) < set_length:
			self.redis.zadd(myset, 1.0, mykey)
		else:
			vals = self.redis.zrange(myset, 0, 0, withscores=True)
			self.redis.zrem(myset, vals[0])
			self.redis.zadd(myset, vals[1] + 1.0, mykey)

		self.redis.expireat(myset, exp_ts)

	def record(self, deck_id):
		# We TTL for 1 extra hour because predict() starts from the previous hour
		# And looks back self.observation_ttl_hours number of hours
		ttl = (self.observation_ttl_hours + 1) * SECONDS_PER_HOUR
		expire_at = int(time.time()) + ttl
		key = self.to_key(self.current_epoch_hour)

		self.increment(args=[key, self.max_collection_size, deck_id, expire_at])

	def to_key(self, suffix):
		return "%s_%i" % (self.prefix, suffix)

	def get_summary_key(self):
		current_key = self.to_key(self.current_epoch_hour)
		lookback_key = "%s_summary_%i_%i" % (self.prefix, self.lookback_start, self.lookback_end)
		exists = self.ensure_lookback_exists(lookback_key, self.lookback_start, self.lookback_end)
		if self.config["include_current_hour"]:
			if exists:
				summary_key = "%s_summary_%i_%i" % (
					self.prefix,
					self.lookback_start,
					self.current_epoch_hour
				)
				self.ensure_summary_exists(summary_key, lookback_key, current_key)
				return summary_key
			else:
				# There is less than 1 hour of data so just return the current hour's set
				return current_key
		else:
			return lookback_key

	def ensure_summary_exists(self, summary_key, lookback_key, current_key):
		self.redis.zunionstore(summary_key, [lookback_key, current_key])
		self.redis.expire(summary_key, 2 * SECONDS_PER_HOUR)

	def ensure_lookback_exists(self, key, start, end):
		"""Returns True if the key is exists in Redis"""
		if not self.redis.exists(key):

			summarized_sets = []

			for suffix in range(start, end + 1):
				member_key = self.to_key(suffix)

				# Some deep leaf nodes may not have data for every hour
				if self.redis.exists(member_key):
					summarized_sets.append(member_key)

			if len(summarized_sets):
				self.redis.zunionstore(key, summarized_sets)

				# The summary table is only used for a single hour
				# So they are save to expire after two hours
				self.redis.expire(key, 2 * SECONDS_PER_HOUR)
				return True
			else:
				return False
		else:
			return True

	def predict(self):
		most_popular = self.distribution()
		if most_popular and len(most_popular) > 1:
			if most_popular[0][1] == most_popular[1][1]:
				return None
			else:
				return int(most_popular[0][0])
		elif most_popular and len(most_popular) == 1:
			return int(most_popular[0][0])
		else:
			return None

	def deck_popularity(self, deck_id):
		all_decks = dict(self.distribution(all=True))
		total_observations = float(sum(all_decks.values()))
		deck_observations = float(all_decks[str(deck_id).encode("utf8")])
		return deck_observations / total_observations

	def distribution(self, all=False):
		num_items = -1 if all else 20
		summary_key = self.get_summary_key()
		return self.redis.zrevrange(summary_key, 0, num_items, withscores=True)

	@property
	def current_epoch_hour(self):
		if self.config["epoch_hour_override"]:
			return self.config["epoch_hour_override"]
		else:
			return int(time.time() / SECONDS_PER_HOUR)

	@property
	def previous_epoch_hour(self):
		return self.current_epoch_hour - 1

	@property
	def lookback_start(self):
		return self.previous_epoch_hour - self.observation_ttl_hours

	@property
	def lookback_end(self):
		return self.previous_epoch_hour

	@property
	def deck_count(self):
		summary_key = self.get_summary_key()
		return self.redis.zcard(summary_key)

	@property
	def max_collection_size(self):
		# Nodes closer to the root retain more deck state
		# Since a greater percentage of the global deck volume flows through them
		# 0 -> 100 * (16 / 2 ** 0) = 1600
		# 1 -> 100 * (16 / 2 ** 0)
		# 2 -> 100 * (16 / 2 ** 1)
		# 3 -> 100 * (16 / 2 ** 1)
		# 4 -> 100 * (16 / 2 ** 2)
		# 5 -> 100 * (16 / 2 ** 2)
		# 6 -> 100 * (16 / 2 ** 3)
		# 7 -> 100 * (16 / 2 ** 3)
		# 8 -> 100 * (16 / 2 ** 4) = 100
		# 9+ = 100
		return int(100.0 * ceil(16.0 / pow(2.0, floor(self.depth / 2.0))))


class DeckStorage:

	def __init__(self, tree, redis, config=None):
		self.tree = tree
		self.redis = redis
		self.config = config if config else {}
		self.config.setdefault("cache_ttl", CACHE_TTL)
		self.prefix = "DECK_STORAGE"

	def to_key(self, deck_id):
		return "%s:%s" % (self.prefix, str(deck_id))

	def store(self, deck_id, dbf_list):
		members = defaultdict(int)
		for dbf in dbf_list:
			members[dbf] += 1
		self.redis.hmset(self.to_key(deck_id), members)
		self.redis.expire(self.to_key(deck_id), self.config["cache_ttl"])

	def is_subset(self, dbf_list, deck_id):
		members = defaultdict(int)
		for dbf in dbf_list:
			members[dbf] += 1

		card_counts = self.redis.hmget(self.to_key(deck_id), keys=members.keys())
		return all(partial <= full for partial, full in zip(members.values(), card_counts))


class DeckPrefixTree:
	# The minimum number of turns we must observe before we attempt to predict the deck
	MINIMUM_PREDICTION_DEPTH = 3

	# We stop traversing when the node has observed fewer than this
	# many unique decks
	BRUTE_FORCE_CUTOFF = 100

	# How many hours beyond the hour when it was observed
	# That an observation will last before it ages out.
	OBSERVATION_TTL_HOURS = 48

	# Potential Bloomfilter Implementation
	# https://github.com/erikdubbelboer/redis-lua-scaling-bloom-filter

	def __init__(self, redis, config=None):
		self.redis = redis

		self.config = config if config else {}
		self.config.setdefault("use_lua", True)
		self.config.setdefault("minimum_prediction_depth", 3)
		self.config.setdefault("brute_force_trigger", 100)
		self.config.setdefault("max_brute_force_limit", 800)
		self.config.setdefault("observation_ttl_hours", 48)

		# Consider setting this to something like 8 or 10 to limit tree size
		# This will likely cause more brute force searching as a trade off
		self.config.setdefault("max_observation_depth", 30)
		self.config.setdefault("cache_ttl", CACHE_TTL)

		self.storage = DeckStorage(self, self.redis, self.config)
		self.root = TreeNode(self, None, self.redis, 0, None, self.config)

	def observe(self, deck_id, dbf_list, play_sequences):
		self.storage.store(deck_id, dbf_list)
		return self.root.observe(deck_id, copy(play_sequences))

	def lookup(self, dbf_list, play_sequences, force=False):
		# force=True will override the MINIMUM_PREDICTION_DEPTH
		return self.root.lookup(dbf_list, copy(play_sequences), force)

	def brute_force_lookup(self, dbf_list, most_popular):
		# most_popular must be a map of deck_ids to observation accounts
		# so we can determine which one to return if multiple match
		first_match = None
		first_match_observations = None
		second_match = None
		second_match_observations = None

		for deck_id, num_observations in most_popular:
			if self.storage.is_subset(dbf_list, deck_id):
				if not first_match:
					first_match = deck_id
					first_match_observations = num_observations
				elif not second_match:
					second_match = deck_id
					second_match_observations = num_observations

		if first_match:
			if first_match_observations == second_match_observations:
				return None
			else:
				return int(first_match)
		else:
			return None


class TreeNode:

	def __init__(self, tree, parent, redis, depth, play_sequence, config):
		self.tree = tree
		self.parent = parent
		self.redis = redis
		self.depth = depth
		self.play_sequence = play_sequence
		self.sequence_str = self.to_sequence_str(play_sequence)
		self.config = config
		self.key = self.make_key()
		self.children_key = "%s_children" % self.key
		self.oracle = DeckOracle(
			self.redis,
			self.key,
			self.depth,
			self.config
		)

	def make_key(self):
		prefix = self.parent.key + "|" if self.parent else ""
		suffix = self.sequence_str
		return prefix + suffix

	def to_sequence_str(self, play_sequence):
		if play_sequence is not None:
			return ",".join(map(str, sorted(play_sequence)))
		else:
			return "ROOT"

	def get_child(self, play_sequence, create=False):
		sequence_str = self.to_sequence_str(play_sequence)
		if self.redis.sismember(self.children_key, sequence_str):
			return TreeNode(
				self.tree,
				self,
				self.redis,
				self.depth + 1,
				play_sequence,
				self.config
			)
		elif create:
			self.redis.sadd(self.children_key, sequence_str)
			self.redis.expire(self.children_key, self.config["cache_ttl"])
			return TreeNode(
				self.tree,
				self,
				self.redis,
				self.depth + 1,
				play_sequence,
				self.config
			)
		else:
			return None

	def observe(self, deck_id, play_sequences):
		self.oracle.record(deck_id)
		if self.depth < self.config["max_observation_depth"] and len(play_sequences):
			next_play_sequence = play_sequences.pop(0)
			node = self.get_child(next_play_sequence, create=True)
			return node.observe(deck_id, play_sequences)

	def should_descend(self, play_sequences):
		child_exists = len(play_sequences) and self.get_child(play_sequences[0])
		# Don't descend further, even if we can
		# Once the data starts to get to be too sparse
		should_brute_force = self.should_attempt_brute_force()
		return child_exists and not should_brute_force

	def should_attempt_brute_force(self):
		return self.oracle.deck_count < self.config["brute_force_trigger"]

	def can_attempt_brute_force(self):
		return self.oracle.deck_count < self.config["max_brute_force_limit"]

	def can_attempt_predict(self, force, play_sequences):
		min_depth_reached = self.depth >= self.config["minimum_prediction_depth"]
		play_sequence_empty = (len(play_sequences) == 0 and min_depth_reached)
		can_brute_force = (min_depth_reached and self.can_attempt_brute_force())
		return force or play_sequence_empty or can_brute_force

	def attempt_predict(self, dbf_list, play_sequences):
		# Don't use oracle prediction if play_sequences is not empty
		# It could return a deck that doesn't contain cards in the remaining
		# play_sequence members which would be an error
		unused_play_sequence_count = len(play_sequences)
		used_brute_force = False
		if unused_play_sequence_count:
			result = None
		else:
			result = self.oracle.predict()

		if not result and self.can_attempt_brute_force():
			# If the number of decks is small enough to brute force
			# It is always safe to attempt
			used_brute_force = True
			result = self.tree.brute_force_lookup(
				dbf_list,
				self.oracle.distribution(all=True)
			)

		if result:
			deck_popularity = self.oracle.deck_popularity(result)
		else:
			deck_popularity = None

		influx_metric("deck_prediction_attempt", {
			"deck_id": result,
			"node": self.key,
			"depth": self.depth,
			"oracle_deck_count": self.oracle.deck_count,
			"used_brute_force": used_brute_force,
			"deck_popularity": deck_popularity,
			"unused_play_sequence_count": unused_play_sequence_count,
		})

		return result

	def lookup(self, dbf_list, play_sequences, force=False):
		if self.should_descend(play_sequences):
			next_play_sequence = play_sequences.pop(0)
			node = self.get_child(next_play_sequence)

			# should_descend() will not be True if node = None
			result = node.lookup(dbf_list, play_sequences, force)

			# If the children failed to predict and we don't have too many decks
			# Then attempt prediction at this node before bubbling None further up
			if not result and self.can_attempt_predict(force, play_sequences):
				result = self.attempt_predict(dbf_list, play_sequences)

			return result

		elif self.can_attempt_predict(force, play_sequences):
			return self.attempt_predict(dbf_list, play_sequences)
		else:
			return None
