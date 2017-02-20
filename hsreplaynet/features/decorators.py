from functools import wraps
from django.core.exceptions import PermissionDenied
from django.views.generic import View
from hsreplaynet.utils.instrumentation import error_handler
from .models import Feature


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

			try:
				feature = Feature.objects.get(name=feature_name)
			except Feature.DoesNotExist as e:
				error_handler(e)
				# Missing features are treated as if they are set to
				# FeatureStatus.STAFF_ONLY. This occurs when new feature code is deployed
				# before the DB is updated
				is_enabled = request.user.is_staff
			else:
				is_enabled = feature.enabled_for_user(request.user)

			if is_enabled:
				return view_func(arg1, *args, **kwargs)
			else:
				raise PermissionDenied()

		return wrapper

	return decorator
