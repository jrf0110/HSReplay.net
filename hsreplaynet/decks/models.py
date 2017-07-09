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
from hsreplaynet.utils import log
from hsreplaynet.utils.aws.redshift import get_redshift_query
from hsreplaynet.utils.db import dictfetchall


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
		distance_cutoff = settings.ARCHETYPE_MINIMUM_SIGNATURE_MATCH_CUTOFF_DISTANCE
		archetype = Archetype.objects.classify_deck(
			deck, player_class, game_format, distance_cutoff
		)
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
		for include in self.includes.select_related("card").all():
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
	SIGNATURE_COMPONENTS_QUERY_TEMPLATE = """
		WITH signatures AS (
			SELECT
				ds.archetype_id,
				max(ds.id) AS signature_id
			FROM decks_signature ds
			WHERE ds.archetype_id IN ({archetype_ids})
			AND ds.format = {format}
			GROUP BY ds.archetype_id
		)
		SELECT
			s.archetype_id,
			c.card_id,
			c.weight
		FROM decks_signaturecomponent c
		JOIN signatures s ON s.signature_id = c.signature_id;
	"""

	def _fetch_signature_weights(self, archetypes, game_format):
		archetype_ids_for_class = ",".join([str(a.id) for a in archetypes])
		query = self.SIGNATURE_COMPONENTS_QUERY_TEMPLATE.format(
			archetype_ids=archetype_ids_for_class,
			format=str(int(game_format))
		)
		with connection.cursor() as cursor:
			cursor.execute(query)
			result = defaultdict(dict)
			for record in dictfetchall(cursor):
				result[record["archetype_id"]][record["card_id"]] = record["weight"]
			return result

	def classify_deck(self, deck, player_class, game_format, distance_cutoff):
		distances = []
		archetypes_for_class = list(Archetype.objects.filter(player_class=player_class))
		if not archetypes_for_class:
			return

		signature_weights = self._fetch_signature_weights(archetypes_for_class, game_format)
		card_counts = {i.card_id: i.count for i in deck.includes.all()}
		for archetype in archetypes_for_class:
			distance = 0
			if archetype.id in signature_weights:
				for card_id, weight in signature_weights[archetype.id].items():
					if card_id in card_counts:
						distance += (card_counts[card_id] * weight)

			if distance and distance >= distance_cutoff:
				distances.append((archetype, distance))

		if distances:
			distances = sorted(distances, key=lambda t: t[1], reverse=True)
			return distances[0][0]

	def _get_deck_observation_counts_from_redshift(self, format):
		query = get_redshift_query("list_decks_by_win_rate")
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

		data = paramiterized_query.response_payload["series"]["data"]
		observations = {}
		for player_class, decks in data.items():
			for deck in decks:
				observations[deck["digest"]] = deck["total_games"]

		return data

	def update_signatures(self, archetype):
		self.update_signatures_for_format(enums.FormatType.FT_STANDARD, archetype=archetype)
		self.update_signatures_for_format(enums.FormatType.FT_WILD, archetype=archetype)

	def update_signatures_for_format(self, game_format, archetype):
		deck_observation_counts = self._get_deck_observation_counts_from_redshift(game_format)
		card_prevalance_counts = {}
		digests = list(deck_observation_counts.keys())
		deck_occurences = 0

		for deck in Deck.objects.filter(digest__in=digests, archetype_id=archetype.id):
			obs_count = deck_observation_counts[deck.digest]
			deck_occurences += obs_count
			for card in deck:
				if card not in card_prevalance_counts:
					card_prevalance_counts[card] = 0
				card_prevalance_counts[card] += obs_count

		msg1 = "Generating new %s signature for archetype: %s"
		log.info(msg1 % (game_format.name, archetype.name))
		msg2 = "Deck occurances contributing to signature: %s"
		log.info(msg2 % str(deck_occurences))
		signature = Signature.objects.create(
			archetype=archetype, format=game_format, as_of=timezone.now()
		)

		for card, observation_count in card_prevalance_counts.items():
			prevalance = float(observation_count) / deck_occurences

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
		card_counts = {i.card_id: i.count for i in deck.includes.all()}
		for component in self.components.all():
			if component.card in card_counts:
				dist += (card_counts[component.card_id] * component.weight)
		return dist

	def to_dbf_map(self):
		result = {}
		for component in self.components.all():
			result[component.card.dbf_id] = [component.weight, component.card.name]
		return result


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
