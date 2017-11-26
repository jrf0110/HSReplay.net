from functools import wraps

from django.core.exceptions import PermissionDenied
from django.views.generic import View

from .utils import feature_enabled_for_user


def view_requires_feature_access(feature_name):
	"""A decorator for view objects that enforces the feature access policies."""
	def decorator(view_func):
		@wraps(view_func)
		def wrapper(arg1, *args, **kwargs):
			if issubclass(arg1.__class__, View):
				# If we are using class based views the request is in args
				request = args[0]
			else:
				request = arg1

			is_enabled = feature_enabled_for_user(feature_name, request.user)

			if is_enabled:
				return view_func(arg1, *args, **kwargs)
			else:
				raise PermissionDenied()

		return wrapper

	return decorator
