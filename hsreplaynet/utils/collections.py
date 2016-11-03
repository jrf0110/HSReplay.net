import json


def defaultdict_to_vanilla_dict(d):
	dict_str = json.dumps(d)
	return json.loads(dict_str)
