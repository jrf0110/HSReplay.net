from django.db import models
from django_intenum import IntEnumField
from hearthstone.enums import Rarity
from hsreplaynet.games.models import GameReplay
from hsreplaynet.cards.models import Card


class Arena(models.Model):
	started = models.DateTimeField()
	ended = models.DateTimeField(null=True)
	wins = models.PositiveIntegerField()
	losses = models.PositiveIntegerField()
	max_wins = models.PositiveIntegerField(default=12)
	# chest = models.ForeignKey(ArenaChest, null=True)
	# deck = models.ForeignKey(Deck)
	games = models.ManyToManyField(GameReplay)

	def __str__(self):
		"%i - %i (%s - %s)" % (
			self.wins, self.losses, self.started, self.ended or "?"
		)


class ArenaPickCard(models.Model):
	card = models.ForeignKey(Card)
	picked = models.BooleanField(null=True)


class ArenaPick(models.Model):
	index = models.PositiveIntegerField()
	rarity = IntEnumField(Rarity)
	cards = models.ManyToManyField(Card, through=ArenaPickCard)
