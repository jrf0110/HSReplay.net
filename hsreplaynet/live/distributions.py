from django.core.cache import caches
from hearthstone.enums import CardClass
from hsreplaynet.utils.redis import RedisPopularityDistribution


class PlayerClassPopularityWinDistribution:
	def __init__(self, redis, ttl=600):
		self.observations = RedisPopularityDistribution(
			redis,
			name="PLAYER_CLASS_OBSERVATIONS",
			namespace="POPULARITY",
			ttl=ttl,
			max_items=9,
			bucket_size=1
		)
		self.wins = RedisPopularityDistribution(
			redis,
			name="PLAYER_CLASS_WINS",
			namespace="POPULARITY",
			ttl=ttl,
			max_items=9,
			bucket_size=1
		)

	def increment(self, player_class, win=False, as_of=None):
		self.observations.increment(player_class, as_of=as_of)
		if win:
			self.wins.increment(player_class, as_of=as_of)

	def distribution(self, start_ts, end_ts):
		games = self.observations.distribution(
			start_ts=start_ts,
			end_ts=end_ts,
		)
		wins = self.wins.distribution(
			start_ts=start_ts,
			end_ts=end_ts,
		)
		result = {}
		for i in range(2, 11):
			player_class = CardClass(i)
			result[player_class.name] = {
				"games": games.get(player_class.name, 0),
				"wins": wins.get(player_class.name, 0)
			}
		return result


def get_player_class_distribution(redis_client=None, ttl=600):
	if redis_client:
		redis = redis_client
	else:
		redis = caches["decks"].client.get_client()

	return PlayerClassPopularityWinDistribution(redis, ttl=ttl)
