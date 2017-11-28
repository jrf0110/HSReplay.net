from django.conf import settings
from django.db import models
from django_intenum import IntEnumField
from enum import IntEnum


class PremiumCancellationReason(IntEnum):
	NOT_GIVEN = 0
	STOPPED_PLAYING_HEARTHSTONE = 1
	TOO_EXPENSIVE = 2
	NOT_USEFUL = 3
	NOT_ENOUGH_FEATURES = 4
	BETTER_ALTERNATIVE = 5
	OTHER = 6


class PremiumCancellation(models.Model):
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL)
	submitted = models.DateTimeField(auto_now_add=True)

	reason = IntEnumField(enum=PremiumCancellationReason, default=PremiumCancellationReason.NOT_GIVEN)
	reason_details = models.TextField(blank=True)
	keep_hdt = models.BooleanField()
	feedback = models.TextField(blank=True)

	reactived = models.DateTimeField(null=True, blank=True)
