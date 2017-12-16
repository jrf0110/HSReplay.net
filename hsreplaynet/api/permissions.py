from rest_framework import permissions

from hsreplaynet.features.models import Feature


class IsOwnerOrStaff(permissions.BasePermission):
	"""
	Permission check that only authorizes owners or staff.
	"""

	OWNER_FIELD = "user"

	def has_object_permission(self, request, view, obj):
		if request.user.is_staff:
			return True
		return getattr(obj, self.OWNER_FIELD) == request.user


class IsOwnerOrReadOnly(permissions.BasePermission):
	"""
	Permission check that fails on unsafe methods, unless the
	user owns that object.
	"""

	OWNER_FIELD = "user"

	def has_object_permission(self, request, view, obj):
		if request.method in permissions.SAFE_METHODS:
			return True
		return getattr(obj, self.OWNER_FIELD) == request.user


class BaseUserHasFeature(permissions.BasePermission):
	"""
	Permission check that only authorizes staff or users with
	the provided feature.
	"""

	FEATURE = None

	def has_permission(self, request, view):
		if request.user.is_staff:
			return True
		feature = Feature.objects.get(name=self.FEATURE)
		return feature.enabled_for_user(request.user)


def UserHasFeature(feature_name):
	return type("UserHasFeature", (BaseUserHasFeature, ), {"FEATURE": feature_name})
