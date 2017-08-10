from collections import defaultdict
from datetime import datetime, timedelta
from django.http import Http404, JsonResponse
from hearthstone.enums import BnetGameType
from hsreplaynet.live.distributions import (
	get_played_cards_distribution, get_player_class_distribution
)

_PLAYER_CLASS_CACHE = defaultdict(dict)


def _get_base_ts(bucket_size=5):
	current_ts = datetime.utcnow()
	td = timedelta(seconds=60, microseconds=current_ts.microsecond)
	base_ts = current_ts - td
	base_ts = base_ts - timedelta(seconds=(base_ts.second % bucket_size))
	return base_ts


def _validate_game_type(game_type_name):
	if not hasattr(BnetGameType, game_type_name):
		raise Http404("Invalid GameType")


def fetch_player_class_distribution(request, game_type_name):
	"""Return the last 60 seconds of player class data using a 5 minute sliding window"""
	_validate_game_type(game_type_name)

	player_class_popularity = get_player_class_distribution(game_type_name)

	# base_ts ensures we generate the result at most once per bucket_size seconds
	base_ts = _get_base_ts(bucket_size=5)

	if _PLAYER_CLASS_CACHE[game_type_name].get("as_of", None) != base_ts:
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
		_PLAYER_CLASS_CACHE[game_type_name]["as_of"] = base_ts
		_PLAYER_CLASS_CACHE[game_type_name]["payload"] = result

	return JsonResponse(
		{"data": _PLAYER_CLASS_CACHE[game_type_name].get("payload", [])},
		json_dumps_params=dict(indent=4)
	)


_PLAYED_CARDS_CACHE = defaultdict(dict)


def fetch_played_cards_distribution(request):

	# base_ts ensures we generate the result at most once per bucket_size seconds
	base_ts = _get_base_ts(bucket_size=5)

	eligible_game_types = [
		BnetGameType.BGT_RANKED_WILD,
		BnetGameType.BGT_RANKED_STANDARD,
		BnetGameType.BGT_ARENA
	]

	if _PLAYER_CLASS_CACHE["ALL"].get("as_of", None) != base_ts:
		payload = {}
		for game_type in eligible_game_types:
			played_cards_popularity = get_played_cards_distribution(game_type.name)
			result = []
			for i in range(0, 61, 5):
				end_ts = base_ts + timedelta(seconds=i)
				start_ts = end_ts - timedelta(seconds=300)
				data = played_cards_popularity.distribution(
					start_ts=start_ts,
					end_ts=end_ts,
					limit=20
				)
				result.append({
					"ts": int(end_ts.timestamp()),
					"data": data
				})
			payload[game_type.name] = result

		_PLAYER_CLASS_CACHE["ALL"]["as_of"] = base_ts
		_PLAYER_CLASS_CACHE["ALL"]["payload"] = payload

	return JsonResponse(
		_PLAYER_CLASS_CACHE["ALL"].get("payload", {}),
		json_dumps_params=dict(indent=4)
	)


def fetch_played_cards_distribution_for_gametype(request, game_type_name):
	"""Return the last 60 seconds of played cards data using a 5 minute sliding window"""
	_validate_game_type(game_type_name)

	played_cards_popularity = get_played_cards_distribution(game_type_name)

	# base_ts ensures we generate the result at most once per bucket_size seconds
	base_ts = _get_base_ts(bucket_size=5)

	if _PLAYED_CARDS_CACHE[game_type_name].get("as_of", None) != base_ts:
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
		_PLAYED_CARDS_CACHE[game_type_name]["as_of"] = base_ts
		_PLAYED_CARDS_CACHE[game_type_name]["payload"] = result

	return JsonResponse(
		{"data": _PLAYED_CARDS_CACHE[game_type_name].get("payload", [])},
		json_dumps_params=dict(indent=4)
	)
