from hsreplaynet.utils import log


def merge_users(base_user, user):
	"""
	Merge user into base_user
	"""
	def do_queryset(qs, **kwargs):
		if not kwargs:
			kwargs = {"user": base_user}
		ret = qs.update(**kwargs)
		log.info("Merging %r -> %r: %r", user, base_user, ret)
		return ret

	# Auth tokens
	do_queryset(user.auth_tokens)

	# Replays
	do_queryset(user.replays)

	# Comments
	do_queryset(user.comment_comments)
	do_queryset(user.comment_flags)

	# Pegasus Accounts
	do_queryset(user.pegasusaccount_set)

	# Emails
	do_queryset(user.emailaddress_set)

	# Social accounts
	do_queryset(user.socialaccount_set)

	# Webhooks
	do_queryset(user.webhooks)
