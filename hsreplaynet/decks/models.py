import hashlib
import json
import string
from collections import defaultdict
from django.conf import settings
from django.db import connection, models
from django.dispatch.dispatcher import receiver
from django.urls import reverse
from django.utils import timezone
from django.utils.functional import cached_property
from django_hearthstone.cards.models import Card
from django_intenum import IntEnumField
from hearthstone import deckstrings, enums
from shortuuid.main import int_to_string, string_to_int
from hsreplaynet.analytics.processing import get_redshift_catalogue
from hsreplaynet.utils import log


ALPHABET = string.ascii_letters + string.digits


class DeckManager(models.Manager):
	def get_or_create_from_id_list(
		self,
		id_list,
		hero_id=None,
		game_type=None,
		classify_into_archetype=False
	):
		deck, created = self._get_or_create_deck_from_db(id_list)

		archetypes_enabled = settings.ARCHETYPE_CLASSIFICATION_ENABLED
		if archetypes_enabled and classify_into_archetype and not deck.archetype_id:
			player_class = self._convert_hero_id_to_player_class(hero_id)
			self.classify_deck_with_archetype(deck, player_class, deck.format)

		return deck, created

	def _get_or_create_deck_from_db(self, id_list):
		if not id_list:
			# Empty list; not supported by our db function
			digest = generate_digest_from_deck_list(id_list)
			return Deck.objects.get_or_create(digest=digest)

		# This native implementation in the DB is to reduce the volume
		# of DB chatter between Lambdas and the DB
		cursor = connection.cursor()
		cursor.callproc("get_or_create_deck", (id_list, ))
		result_row = cursor.fetchone()
		deck_id = int(result_row[0])
		created_ts, digest, created, deck_size = result_row[1:]
		cursor.close()
		d = Deck.objects.get(id=deck_id)
		return d, created

	def _convert_hero_id_to_player_class(self, hero_id):
		if isinstance(hero_id, int):
			return Card.objects.get(dbf_id=hero_id).card_class
		elif hero_id:
			return Card.objects.get(card_id=hero_id).card_class
		return enums.CardClass.INVALID

	def classify_deck_with_archetype(self, deck, player_class, game_format):
		archetype = Archetype.objects.classify_deck(deck, player_class, game_format)
		if archetype:
			deck.archetype = archetype
			deck.save()

	def get_by_shortid(self, shortid):
		try:
			id = string_to_int(shortid, ALPHABET)
		except ValueError:
			raise Deck.DoesNotExist("Invalid deck ID")
		digest = hex(id)[2:].rjust(32, "0")
		return Deck.objects.get(digest=digest)


def generate_digest_from_deck_list(id_list):
	sorted_cards = sorted(id_list)
	m = hashlib.md5()
	m.update(",".join(sorted_cards).encode("utf-8"))
	return m.hexdigest()


class Deck(models.Model):
	"""
	Represents an abstract collection of cards.

	The default sorting for cards when iterating over a deck is by
	mana cost and then alphabetical within cards of equal cost.
	"""

	id = models.BigAutoField(primary_key=True)
	objects = DeckManager()
	cards = models.ManyToManyField(Card, through="Include")
	digest = models.CharField(max_length=32, unique=True)
	created = models.DateTimeField(auto_now_add=True, null=True, blank=True)
	archetype = models.ForeignKey(
		"decks.Archetype", on_delete=models.SET_NULL, blank=True, null=True
	)
	size = models.IntegerField(null=True)

	class Meta:
		db_table = "cards_deck"

	def __str__(self):
		if self.deck_class:
			return "%s Deck" % (self.deck_class.name.capitalize())
		return "Neutral Deck"

	def __repr__(self):
		values = self.includes.values("card__name", "count", "card__cost")
		alpha_sorted = sorted(values, key=lambda t: t["card__name"])
		mana_sorted = sorted(alpha_sorted, key=lambda t: t["card__cost"])
		value_map = ["%s x %i" % (c["card__name"], c["count"]) for c in mana_sorted]
		return "[%s]" % (", ".join(value_map))

	def __iter__(self):
		# sorted() is stable, so sort alphabetically first and then by mana cost
		alpha_sorted = sorted(self.cards.all(), key=lambda c: c.name)
		mana_sorted = sorted(alpha_sorted, key=lambda c: c.cost)
		return mana_sorted.__iter__()

	@cached_property
	def hero(self):
		deck_class = self.deck_class
		if deck_class and deck_class != enums.CardClass.NEUTRAL:
			return deck_class.default_hero

	@property
	def hero_dbf_id(self):
		return Card.objects.get(card_id=self.hero).dbf_id

	@cached_property
	def deck_class(self):
		for include in self.includes.all():
			card_class = include.card.card_class
			if card_class not in (enums.CardClass.INVALID, enums.CardClass.NEUTRAL):
				return card_class
		return enums.CardClass.INVALID

	@cached_property
	def deckstring(self):
		cardlist = self.card_dbf_id_list()
		sorted_list = sorted(set(cardlist))
		cards = [(id, cardlist.count(id)) for id in sorted_list]
		return deckstrings.write_deckstring(cards, [self.hero_dbf_id], self.format)

	@cached_property
	def format(self):
		for include in self.includes.all():
			is_classic = include.card.card_set in (enums.CardSet.EXPERT1, enums.CardSet.CORE)
			if not is_classic and not include.card.card_set.is_standard:
				return enums.FormatType.FT_WILD
		return enums.FormatType.FT_STANDARD

	@property
	def shortid(self):
		return int_to_string(int(self.digest, 16), ALPHABET)

	@property
	def all_includes(self):
		"""
		Use instead of .includes if you know you will use all of them
		this will prefetch the related cards. (eg. in a deck list)
		"""
		fields = ("id", "count", "deck_id", "card__name")
		return self.includes.all().select_related("card").only(*fields)

	def get_absolute_url(self):
		return reverse("deck_detail", kwargs={"id": self.shortid})

	def save(self, *args, **kwargs):
		EMPTY_DECK_DIGEST = "d41d8cd98f00b204e9800998ecf8427e"
		if self.digest != EMPTY_DECK_DIGEST and self.includes.count() == 0:
			# A client has set a digest by hand, so don't recalculate it.
			return super(Deck, self).save(*args, **kwargs)
		else:
			self.digest = generate_digest_from_deck_list(self.card_id_list())
			return super(Deck, self).save(*args, **kwargs)

	def card_dbf_id_list(self):
		result = []

		includes = self.includes.values_list("card__dbf_id", "count")
		for id, count in includes:
			for i in range(count):
				result.append(id)

		return result

	def card_id_list(self):
		result = []

		includes = self.includes.values_list("card__card_id", "count")
		for id, count in includes:
			for i in range(count):
				result.append(id)

		return result

	def as_dbf_json(self, serialized=True):
		"""Serialize the deck list for storage in Redshift"""
		result = []
		for include in self.includes.all():
			result.append([include.card.dbf_id, include.count])

		if serialized:
			# separators=(",", ":") creates compact JSON encoding
			return json.dumps(result, separators=(",", ":"))
		else:
			return result


@receiver(models.signals.post_save, sender=Deck)
def update_deck_size_field(sender, instance, **kwargs):
	current_deck_size = sum(i.count for i in instance.includes.all())

	if instance.size != current_deck_size:
		instance.size = current_deck_size
		# Make sure to only save when updating to prevent recursion
		instance.save()


class Include(models.Model):
	id = models.BigAutoField(primary_key=True)
	deck = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name="includes")
	card = models.ForeignKey(Card, on_delete=models.PROTECT, related_name="included_in")
	count = models.IntegerField(default=1)

	class Meta:
		db_table = "cards_include"
		unique_together = ("deck", "card")

	def __str__(self):
		return "%s x %s" % (self.card.name, self.count)


class ArchetypeManager(models.Manager):
	def archetypes_for_class(self, player_class, format):
		result = {}

		for archetype in Archetype.objects.filter(player_class=player_class):
			canonical_decks = archetype.get_canonical_decks(format)
			if canonical_decks:
				result[archetype] = canonical_decks

		return result

	def classify_deck(self, deck, player_class, game_format):
		distances = []
		distance_cutoff = settings.ARCHETYPE_MINIMUM_SIGNATURE_MATCH_CUTOFF_DISTANCE
		for archetype in Archetype.objects.filter(player_class=player_class):
			distance = archetype.distance(deck, game_format)
			if distance and distance >= distance_cutoff:
				distances.append((archetype, distance))

		distances = sorted(distances, key=lambda t: t[1], reverse=True)
		if distances:
			return distances[0][0]
		else:
			return None

	def _get_deck_observation_counts_from_redshift(self, format):
		query = get_redshift_catalogue().get_query("list_decks_by_win_rate")
		if format == enums.FormatType.FT_STANDARD:
			paramiterized_query = query.build_full_params(dict(
				TimeRange="LAST_30_DAYS",
				GameType="RANKED_STANDARD",
			))
		else:
			paramiterized_query = query.build_full_params(dict(
				TimeRange="LAST_30_DAYS",
				GameType="RANKED_WILD",
			))
		return paramiterized_query.response_payload["series"]["data"]

	def update_signatures(self, archetype=None):
		self.update_signatures_for_format(enums.FormatType.FT_STANDARD, archetype=archetype)
		self.update_signatures_for_format(enums.FormatType.FT_WILD, archetype=archetype)

	def update_signatures_for_format(self, game_format, archetype=None):
		redshift_data = self._get_deck_observation_counts_from_redshift(game_format)

		if redshift_data:
			deck_observation_counts = {}
			digests = []
			for player_class, decks in redshift_data.items():
				for deck in decks:
					digests.append(deck["digest"])
					deck_observation_counts[deck["digest"]] = deck["total_games"]

			card_prevalance_counts = defaultdict(lambda: defaultdict(int))
			deck_occurances_per_archetype = defaultdict(int)
			for deck in Deck.objects.filter(digest__in=digests):
				if deck.archetype_id:
					obs_count = deck_observation_counts[deck.digest]
					deck_occurances_per_archetype[deck.archetype_id] = obs_count
					if deck.digest in deck_observation_counts:
						for card in deck:
							card_prevalance_counts[deck.archetype_id][card] += obs_count

			archetypes_for_update = [archetype] if archetype else Archetype.objects.all()
			for archetype in archetypes_for_update:
				deck_occurances = deck_occurances_per_archetype[archetype.id]
				msg1 = "Generating new %s signature for archetype: %s"
				log.info(msg1 % (game_format.name, archetype.name))
				msg2 = "Deck occurances contributing to signature: %s"
				log.info(msg2 % str(deck_occurances))
				signature = Signature.objects.create(
					archetype=archetype,
					format=game_format,
					as_of=timezone.now()
				)

				for card, observation_count in card_prevalance_counts[archetype.id].items():
					prevalance = float(observation_count) / deck_occurances

					if prevalance >= settings.ARCHETYPE_CORE_CARD_THRESHOLD:
						log.info(
							"card: %s with prevalence: %s is CORE" % (card.name, prevalance)
						)
						SignatureComponent.objects.create(
							signature=signature,
							card=card,
							weight=settings.ARCHETYPE_CORE_CARD_WEIGHT * prevalance
						)
					elif prevalance >= settings.ARCHETYPE_TECH_CARD_THRESHOLD:
						log.info(
							"card: %s with prevalence: %s is TECH" % (card.name, prevalance)
						)
						SignatureComponent.objects.create(
							signature=signature,
							card=card,
							weight=settings.ARCHETYPE_TECH_CARD_WEIGHT * prevalance
						)
					else:
						msg3 = "card: %s with prevalence: %s is DISCARD"
						log.info(msg3 % (card.name, prevalance))


class Archetype(models.Model):
	"""
	Archetypes cluster decks with minor card variations that all share the same strategy
	into a common group.

	E.g. 'Freeze Mage', 'Miracle Rogue', 'Pirate Warrior', 'Zoolock', 'Control Priest'
	"""

	id = models.BigAutoField(primary_key=True)
	objects = ArchetypeManager()
	name = models.CharField(max_length=250, blank=True)
	player_class = IntEnumField(enum=enums.CardClass, default=enums.CardClass.INVALID)

	class Meta:
		db_table = "cards_archetype"

	def __str__(self):
		return self.name

	def distance(self, deck, game_format):
		signature = self.get_signature(game_format)
		if signature:
			return signature.distance(deck)
		else:
			return None

	def get_canonical_decks(self, format=enums.FormatType.FT_STANDARD, as_of=None):
		if as_of is None:
			canonicals = self.canonical_decks.filter(
				format=format,
			).order_by("-created").prefetch_related("deck__includes").all()
		else:
			canonicals = self.canonical_decks.filter(
				format=format,
				created__lte=as_of
			).order_by("-created").prefetch_related("deck__includes").all()

		if canonicals:
			return [c.deck for c in canonicals]
		else:
			return None

	def get_signature(self, game_format=enums.FormatType.FT_STANDARD, as_of=None):
		if as_of is None:
			return self.signature_set.filter(
				format=int(game_format),
			).order_by("-as_of").first()
		else:
			return self.signature_set.filter(
				format=int(game_format),
				as_of__lte=as_of
			).order_by("-as_of").first()


class Signature(models.Model):
	id = models.AutoField(primary_key=True)
	archetype = models.ForeignKey(
		Archetype,
		on_delete=models.CASCADE
	)
	format = IntEnumField(enum=enums.FormatType, default=enums.FormatType.FT_STANDARD)
	as_of = models.DateTimeField()

	def distance(self, deck):
		dist = 0
		card_counts = {i.card: i.count for i in deck.includes.all()}
		for component in self.components.all():
			if component.card in card_counts:
				dist += (card_counts[component.card] * component.weight)
		return dist


class SignatureComponent(models.Model):
	id = models.AutoField(primary_key=True)
	signature = models.ForeignKey(
		Signature,
		related_name="components",
		on_delete=models.CASCADE
	)
	card = models.ForeignKey(
		Card,
		related_name="signature_components",
		on_delete=models.PROTECT
	)
	weight = models.FloatField(default=0.0)


class CanonicalDeck(models.Model):
	"""
	The CanonicalDeck for an Archetype is the list of cards that is most commonly
	associated with that Archetype.

	The canonical deck for an Archetype may evolve incrementally over time and is likely to
	evolve more rapidly when new card sets are first released.
	"""

	id = models.BigAutoField(primary_key=True)
	archetype = models.ForeignKey(
		Archetype,
		related_name="canonical_decks",
		on_delete=models.CASCADE
	)
	deck = models.ForeignKey(
		Deck,
		related_name="canonical_for_archetypes",
		on_delete=models.PROTECT
	)
	created = models.DateTimeField(auto_now_add=True)
	format = IntEnumField(enum=enums.FormatType, default=enums.FormatType.FT_STANDARD)

	class Meta:
		db_table = "cards_canonicaldeck"
