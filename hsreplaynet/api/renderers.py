from enum import IntEnum
from rest_framework.renderers import JSONRenderer
from rest_framework.utils.encoders import JSONEncoder


# On python 2, serializing IntEnum into json creates invalid json
# This entire file can be deleted in Python 3

class EnumCompatibleJSONEncoder(JSONEncoder):
	def default(self, obj):
		if isinstance(obj, IntEnum):
			return int(obj)
		return super(EnumCompatibleJSONEncoder, self).default(obj)


class EnumCompatibleJSONRenderer(JSONRenderer):
	encoder_class = EnumCompatibleJSONEncoder
