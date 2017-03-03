from enum import IntEnum
from uuid import uuid4
from django.contrib.auth.models import Group
from django.db import models
from django.dispatch.dispatcher import receiver
from django.utils.timezone import now
from django_intenum import IntEnumField


class FeatureError(Exception):
	pass


class FeatureStatus(IntEnum):
	"""
	A Feature can be in any of the following states:

	- OFF: This is intended for when a feature is failing in production. It
	provides a mechanism for preventing that code from executing that can be activated
	even faster then doing a deploy with a fix or doing something ad-hoc to quiet the
	problem.

	- STAFF_ONLY: The only people who can ever see a feature with this status are the staff
	users. This status will usually be used as a temporary status when a problem arises.
	The "STAFF_ONLY" status allows us to temporarily take away a feature from users without
	needing to pull people out of any of their groups. "STAFF_ONLY" is also the default
	result that template tags and API decorators return if they are unable to reach the
	DB or find the feature in the DB for any reason.

	- IN_PROGRESS: The default status that features start in. In progress features can
	always be seen by staff. When a new feature is created in the database a new group
	for that feature is automatically created. For example, if the feature name is
	"winrates" then the group name will be "feature:winrates:preview". Any user who is made
	a member of that group will then be able to see the feature when it has the IN_PROGRESS
	status.

	- PUBLIC: Features that are public are rendered even for anonymous users. This
	status is the final resting status for any features that are offered for free once the
	development is complete.

	- AUTHORIZED_ONLY: When a new feature is created a second group is auto created based
	on the template "feature:<FEATURE_NAME>:authorized". Any user who is in this group
	will be able to see the feature when it is in this status. This is the final resting
	status for features that are intended to be part of a premium offering. At the
	implementation level, a "Product" can be thought of as a bundle of 1 or more
	features. When a user purchases the product their user is added to the authorized group
	for each feature that is included in the product.
	"""
	OFF = 0
	STAFF_ONLY = 1
	IN_PROGRESS = 2
	PUBLIC = 3
	AUTHORIZED_ONLY = 4
	LOGGED_IN_USERS = 5


class Feature(models.Model):
	"""
	A Feature is any logical chunk of functionality whose visibility should be
	determined at runtime based on the context of the current user. The status of a
	feature and the rules that govern whether it is rendered are determined by the
	FeatureStatus enum that is defined above.

	The read_only flag is a flag that always defaults to False but can be set true
	temporarily when maintenance needs to be done to the database. In order for this to
	work, ALL operations that write to or mutate the database in any way must be wrapped in
	a feature tag or a feature decorator, and they must implement graceful behavior and
	feedback to users when they are operating in read_only mode.

	For version 2 of a released feature, a new feature tag should be created that is named
	appropriately to indicate it is a new version. It's status lifecycle should be
	managed in the usual way for new features, independently of the previous version's
	status.
	"""
	name = models.CharField(max_length=255, null=False, unique=True)
	description = models.TextField(blank=True)
	created = models.DateTimeField(auto_now_add=True)
	status = IntEnumField(enum=FeatureStatus, default=FeatureStatus.IN_PROGRESS)
	read_only = models.BooleanField(default=False)

	def __str__(self):
		return self.name

	def enabled_for_user(self, user):
		if self.status == FeatureStatus.OFF:
			return False

		if user.is_staff:
			# Staff can always see everything except OFF
			return True

		if self.status == FeatureStatus.STAFF_ONLY:
			# If the user is staff we will have already returned True
			return False

		if self.status == FeatureStatus.LOGGED_IN_USERS:
			return user.is_authenticated

		if self.status == FeatureStatus.IN_PROGRESS:
			return user.groups.filter(name=self.preview_group_name).exists()

		if self.status == FeatureStatus.PUBLIC:
			return True

		if self.status == FeatureStatus.AUTHORIZED_ONLY:
			return user.groups.filter(name=self.authorized_group_name).exists()

	def add_user_to_preview_group(self, user):
		group = self.preview_group
		if group not in user.groups.all():
			user.groups.add(self.preview_group)
			return True

	def add_user_to_authorized_group(self, user):
		group = self.authorized_group
		if group not in user.groups.all():
			user.groups.add(self.preview_group)
			return True

	@property
	def preview_group_name(self):
		return "feature:%s:preview" % self.name

	@property
	def preview_group(self):
		return Group.objects.get(name=self.preview_group_name)

	@property
	def authorized_group_name(self):
		return "feature:%s:authorized" % self.name

	@property
	def authorized_group(self):
		return Group.objects.get(name=self.authorized_group_name)


class FeatureInvite(models.Model):
	"""
	Represents an invitation to one or more feature tags.
	"""
	uuid = models.UUIDField(primary_key=True, editable=False, default=uuid4)
	features = models.ManyToManyField(Feature, related_name="invites")
	use_count = models.PositiveIntegerField(
		default=0, editable=False,
		help_text="The amount of times this invitation has been successfully used."
	)
	max_uses = models.PositiveIntegerField(default=0, help_text="0 for unlimited")
	expires = models.DateTimeField(
		blank=True, null=True, help_text="No longer valid after this date."
	)

	created = models.DateTimeField(auto_now_add=True)
	modified = models.DateTimeField(auto_now=True)

	def __str__(self):
		features = self.features.all()
		return "Invitation to %s" % (", ".join(str(f) for f in features))

	@property
	def is_valid(self):
		if self.max_uses and self.max_uses >= self.use_count:
			return False

		if self.expires and now() > self.expires:
			return False

		return True

	def redeem_for_user(self, user):
		if not self.is_valid:
			self.delete()
			raise FeatureError("Invitation is no longer valid.")

		redeemed = False
		for feature in self.features.all():
			if feature.add_user_to_preview_group(user):
				redeemed = True

		if redeemed:
			# The invite is only considered redeemed if it had any effect
			self.use_count += 1
			self.save()

		if not self.is_valid:
			self.delete()


@receiver(models.signals.post_save, sender=Feature)
def create_feature_membership_groups(sender, instance, **kwargs):
	Group.objects.get_or_create(name=instance.preview_group_name)
	Group.objects.get_or_create(name=instance.authorized_group_name)
