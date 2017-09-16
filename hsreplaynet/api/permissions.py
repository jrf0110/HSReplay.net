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


class BaseOAuth2HasScopes(permissions.BasePermission):
	"""
	Permission check that authorizes tokens with a specific scope.
	"""

	READ_SCOPES = None
	WRITE_SCOPES = None
	ALLOW_NON_OAUTH2_AUTHENTICATION = True

	def has_permission(self, request, view):
		if not request.user.is_authenticated:
			return False

		token = request.auth
		if not token or not hasattr(token, "scope"):
			return self.ALLOW_NON_OAUTH2_AUTHENTICATION

		if request.method in permissions.SAFE_METHODS:
			return token.is_valid(self.READ_SCOPES)
		else:
			return token.is_valid(self.WRITE_SCOPES)


def OAuth2HasScopes(read_scopes, write_scopes):
	return type("OAuth2HasScopes", (BaseOAuth2HasScopes, ), {
		"READ_SCOPES": read_scopes, "WRITE_SCOPES": write_scopes,
	})
