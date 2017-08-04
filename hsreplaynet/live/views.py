from datetime import datetime, timedelta
from django.http import JsonResponse
from hsreplaynet.live.distributions import get_player_class_distribution


_PLAYER_CLASS_CACHE = {}


def fetch_player_class_distribution(request):
	"""Return the last 60 seconds of player class data using a 5 minute sliding window"""
	player_class_popularity = get_player_class_distribution()

	current_ts = datetime.utcnow()
	td = timedelta(seconds=60, microseconds=current_ts.microsecond)
	# base_ts ensures we generate the result at most once per second
	base_ts = current_ts - td

	if _PLAYER_CLASS_CACHE.get("as_of", None) != base_ts:
		result = []
		for i in range(61):
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
