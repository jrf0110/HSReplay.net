from django.db import models


class ArenaDraft(models.Model):
	id = models.BigIntegerField(primary_key=True)
	deck_id = models.BigIntegerField()
	pegasus_account = models.ForeignKey(
		"accounts.BlizzardAccount", on_delete=models.PROTECT, related_name="arena_drafts"
	)

	wins = models.PositiveSmallIntegerField(default=0, db_index=True)
	losses = models.PositiveSmallIntegerField(default=0)
	started = models.DateTimeField(db_index=True)
	ended = models.DateTimeField(null=True, blank=True)
	rewards = models.JSONField(null=True)

	created = models.DateTimeField(auto_now_add=True)
	updated = models.DateTimeField(auto_now=True)


class ArenaDraftChoice(models.Model):
	id = models.BigIntegerField(primary_key=True)
	choice_id = models.PositiveSmallIntegerField()
	draft = models.ForeignKey(
		"drafts.ArenaDraft", on_delete=models.CASCADE, related_name="picks"
	)
	index = models.PositiveSmallIntegerField()

	card = models.ForeignKey("cards.Card", on_delete=models.PROTECT)
	golden = models.BooleanField()
	picked = models.DateTimeField(null=True, blank=True)


class DungeonDraft(models.Model):
	id = models.BigIntegerField(primary_key=True)
	deck_id = models.BigIntegerField()
	pegasus_account = models.ForeignKey(
		"accounts.BlizzardAccount", on_delete=models.PROTECT, related_name="dungeon_drafts"
	)

	wins = models.PositiveSmallIntegerField(default=0, db_index=True)
	started = models.DateTimeField(db_index=True)
	ended = models.DateTimeField(null=True, blank=True)

	created = models.DateTimeField(auto_now_add=True)
	updated = models.DateTimeField(auto_now=True)


class DungeonDraftCardsChoice(models.Model):
	id = models.BigIntegerField(primary_key=True)
	draft = models.ForeignKey(
		"drafts.DungeonDraft", on_delete=models.CASCADE, related_name="cards_picks"
	)
	choice_id = models.PositiveSmallIntegerField()
	index = models.PositiveSmallIntegerField()
	wins = models.PositiveSmallIntegerField()

	# bundle = models.IntEnumField(...)
	cards = models.ArrayField(
		models.ForeignKey("cards.Card", on_delete=models.PROTECT), max_size=3
	)
	picked = models.DateTimeField(null=True, blank=True)


class DungeonDraftTreasurePick(models.Model):
	id = models.BigIntegerField(primary_key=True)
	draft = models.ForeignKey(
		"drafts.DungeonDraft", on_delete=models.CASCADE, related_name="treasure_picks"
	)
	choice_id = models.PositiveSmallIntegerField()
	index = models.PositiveSmallIntegerField()
	wins = models.PositiveSmallIntegerField()

	card = models.ForeignKey("cards.Card", on_delete=models.PROTECT)
	picked = models.DateTimeField(null=True, blank=True)
