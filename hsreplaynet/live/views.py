from datetime import datetime, timedelta
from django.http import JsonResponse
from hsreplaynet.live.distributions import (
	get_played_cards_distribution, get_player_class_distribution
)

_PLAYER_CLASS_CACHE = {}


def _get_base_ts(bucket_size=5):
	current_ts = datetime.utcnow()
	td = timedelta(seconds=60, microseconds=current_ts.microsecond)
	base_ts = current_ts - td
	base_ts = base_ts - timedelta(seconds=(base_ts.second % bucket_size))
	return base_ts


def fetch_player_class_distribution(request, game_type_name):
	"""Return the last 60 seconds of player class data using a 5 minute sliding window"""
	player_class_popularity = get_player_class_distribution(game_type_name)

	# base_ts ensures we generate the result at most once per bucket_size seconds
	base_ts = _get_base_ts(bucket_size=5)

	if _PLAYER_CLASS_CACHE.get("as_of", None) != base_ts:
		result = []
		for i in range(0, 61, 5):
			end_ts = base_ts + timedelta(seconds=i)
			start_ts = end_ts - timedelta(seconds=300)
			data = player_class_popularity.distribution(
				start_ts=start_ts,
				end_ts=end_ts
			)
			result.append({
				"ts": int(end_ts.timestamp()),
				"data": data
			})
		_PLAYER_CLASS_CACHE["as_of"] = base_ts
		_PLAYER_CLASS_CACHE["payload"] = result

	return JsonResponse(
		{"data": _PLAYER_CLASS_CACHE.get("payload", [])},
		json_dumps_params=dict(indent=4)
	)


def fetch_played_cards_distribution(request, game_type_name):
	"""Return the last 60 seconds of played cards data using a 5 minute sliding window"""
	played_cards_popularity = get_played_cards_distribution(game_type_name)

	# base_ts ensures we generate the result at most once per bucket_size seconds
	base_ts = _get_base_ts(bucket_size=5)

	if _PLAYER_CLASS_CACHE.get("as_of", None) != base_ts:
		result = []
		for i in range(0, 61, 5):
			end_ts = base_ts + timedelta(seconds=i)
			start_ts = end_ts - timedelta(seconds=300)
			data = played_cards_popularity.distribution(
				start_ts=start_ts,
				end_ts=end_ts,
				limit=10
			)
			result.append({
				"ts": int(end_ts.timestamp()),
				"data": data
			})
		_PLAYER_CLASS_CACHE["as_of"] = base_ts
		_PLAYER_CLASS_CACHE["payload"] = result

	return JsonResponse(
		{"data": _PLAYER_CLASS_CACHE.get("payload", [])},
		json_dumps_params=dict(indent=4)
	)
