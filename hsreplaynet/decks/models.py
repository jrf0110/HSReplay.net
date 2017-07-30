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
from django.utils.text import slugify
from django.utils.timezone import now
from django_hearthstone.cards.models import Card
from django_intenum import IntEnumField
from hearthstone import deckstrings, enums
from hsarchetypes import calculate_signature_weights, classify_deck
from shortuuid.main import int_to_string, string_to_int
from hsreplaynet.utils.aws.clients import FIREHOSE
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
		archetype_ids = list(
			Archetype.objects.filter(player_class=player_class).values_list("id", flat=True)
		)
		if not archetype_ids:
			return

		signature_weights = Archetype.objects.get_signature_weights(
			archetype_ids,
			game_format
		)

		archetype_id = classify_deck(
			deck.dbf_map(), archetype_ids, signature_weights
		)
		if archetype_id:
			deck.update_archetype(archetype_id)

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
	guessed_full_deck = models.ForeignKey(
		"decks.Deck", on_delete=models.PROTECT, null=True, blank=True
	)

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

	def update_archetype(self, archetype, save=True):
		"""
		Set the archetype field and save to the database,
		then call sync_archetype_to_firehose() to replicate the
		archetype update into Redshift.
		"""
		if isinstance(archetype, Archetype):
			archetype_id = archetype.id
		else:
			archetype_id = archetype
		if self.archetype_id == archetype_id:
			return False
		self.archetype_id = archetype_id
		if save:
			self.save()
		self.sync_archetype_to_firehose()

		return True

	def sync_archetype_to_firehose(self):
		timestamp = now().replace(tzinfo=None)
		record = "{deck_id}|{archetype_id}|{as_of}\n".format(
			deck_id=str(self.id),
			archetype_id=str(self.archetype_id or ""),
			as_of=timestamp.isoformat(sep=" "),
		)

		result = FIREHOSE.put_record(
			DeliveryStreamName=settings.ARCHETYPE_FIREHOSE_STREAM_NAME,
			Record={
				"Data": record.encode("utf-8"),
			}
		)

		return result

	def card_dbf_id_list(self):
		result = []

		includes = self.includes.values_list("card__dbf_id", "count")
		for id, count in includes:
			for i in range(count):
				result.append(id)

		return result

	def dbf_map(self):
		includes = self.includes.values_list("card__dbf_id", "count")
		return {id: count for id, count in includes}

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
			sc.card_dbf_id,
			sc.weight
		FROM decks_signaturecomponent sc
		JOIN signatures s ON s.signature_id = sc.signature_id;
	"""

	def get_fully_configured_archetypes(self, game_format, player_class):
		result = []
		for archetype in Archetype.objects.filter(player_class=player_class).all():
			if archetype.is_configured_for_format(game_format):
				result.append(archetype)
		return result

	def get_signature_weights(self, archetype_ids, game_format):
		archetype_ids_sql_list = ",".join(str(id) for id in archetype_ids)
		query = self.SIGNATURE_COMPONENTS_QUERY_TEMPLATE.format(
			archetype_ids=archetype_ids_sql_list,
			format=str(int(game_format))
		)
		with connection.cursor() as cursor:
			cursor.execute(query)
			result = defaultdict(dict)
			for record in dictfetchall(cursor):
				result[record["archetype_id"]][record["card_dbf_id"]] = record["weight"]
			return result

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

		return observations

	def update_signatures(self):
		for player_class in enums.CardClass:
			if enums.CardClass.DRUID <= player_class <= enums.CardClass.WARRIOR:
				self.update_signatures_for_player_class(player_class)

	def update_signatures_for_player_class(self, player_class):
		self.update_signatures_for_format(enums.FormatType.FT_STANDARD, player_class=player_class)
		self.update_signatures_for_format(enums.FormatType.FT_WILD, player_class=player_class)

	def update_signatures_for_format(self, game_format, player_class):
		thresholds = {
			settings.ARCHETYPE_CORE_CARD_THRESHOLD: settings.ARCHETYPE_CORE_CARD_WEIGHT,
			settings.ARCHETYPE_TECH_CARD_THRESHOLD: settings.ARCHETYPE_TECH_CARD_WEIGHT,
		}
		training_data = self.get_training_data_for_player_class(game_format, player_class)

		# TODO: Change to use calculate_signature_weights()
		new_weights = calculate_signature_weights(training_data, thresholds)

		validation_data = self.get_validation_data_for_player_class(game_format, player_class)

		if self.new_weights_pass_validation(new_weights, validation_data):
			for archetype_id, weights in new_weights.items():
				signature = Signature.objects.create(
					archetype=int(archetype_id), format=game_format, as_of=timezone.now()
				)
				for dbf_id, weight in weights.items():
					SignatureComponent.objects.create(
						signature=signature, card_id=int(dbf_id), weight=weight
					)
		else:
			raise RuntimeError("New Signature Weights Failed Validation")

	def get_training_data_for_player_class(self, game_format, player_class):
		observation_counts = self._get_deck_observation_counts_from_redshift(game_format)
		training_decks = ArchetypeTrainingDeck.objects.get_training_decks(
			game_format,
			player_class
		)
		training_deck_digests = [d.digest for d in training_decks]
		digests = [d for d in observation_counts.keys() if d in training_deck_digests]

		configured_archetypes = self.get_fully_configured_archetypes(
			game_format,
			player_class
		)
		configured_archetype_ids = [a.id for a in configured_archetypes]

		includes = Include.objects.filter(
			deck__digest__in=digests,
		).values("deck__digest", "deck__archetype_id", "card__dbf_id", "count")

		training_data = {}
		for include in includes:
			archetype_id = include["deck__archetype_id"]
			if archetype_id not in configured_archetype_ids:
				continue

			if archetype_id not in training_data:
				training_data[archetype_id] = {}
			digest = include["deck__digest"]
			if digest not in training_data[archetype_id]:
				training_data[archetype_id][digest] = {
					"total_games": observation_counts[digest],
					"cards": {}
				}
			dbf = include["card__dbf_id"]
			count = include["count"]
			training_data[archetype_id][digest]["cards"][dbf] = count

		return training_data

	def get_validation_data_for_player_class(self, game_format, player_class):
		validation_decks = ArchetypeTrainingDeck.objects.get_validation_decks(
			game_format,
			player_class
		)

		configured_archetypes = self.get_fully_configured_archetypes(
			game_format,
			player_class
		)
		configured_archetype_ids = [a.id for a in configured_archetypes]

		validation_data = {}
		for deck in validation_decks:
			if deck.archetype.id not in configured_archetype_ids:
				continue

			if deck.archetype.id not in validation_data:
				validation_data[deck.archetype.id] = {}
			if deck.digest not in validation_data[deck.archetype.id]:
				validation_data[deck.archetype.id][deck.digest] = {
					"cards": deck.dbf_map()
				}
		return validation_data

	def new_weights_pass_validation(self, new_weights, validation_data):
		for expected_id, validation_decks in validation_data.items():
			for digest, validation_deck in validation_decks.items():
				deck = validation_deck["cards"]
				assigned_id = classify_deck(
					deck,
					new_weights.keys(),
					new_weights
				)
				if not assigned_id or assigned_id != expected_id:
					return False
		return True


class Archetype(models.Model):
	"""
	Archetypes cluster decks with minor card variations that all share the same strategy
	into a common group.

	E.g. 'Freeze Mage', 'Miracle Rogue', 'Pirate Warrior', 'Zoolock', 'Control Priest'
	"""

	MINIMUM_REQUIRED_VALIDATION_DECKS = 1
	MINIMUM_REQUIRED_TRAINING_DECKS = 3

	id = models.BigAutoField(primary_key=True)
	objects = ArchetypeManager()
	name = models.CharField(max_length=250, blank=True)
	player_class = IntEnumField(enum=enums.CardClass, default=enums.CardClass.INVALID)

	class Meta:
		db_table = "cards_archetype"

	def __str__(self):
		return self.name

	@property
	def standard_signature(self):
		sig = self.signature_set.filter(format=enums.FormatType.FT_STANDARD).latest()
		return {
			"as_of": sig.as_of,
			"format": int(sig.format),
			"components": [(c.card_id, c.weight) for c in sig.components.all()],
		}

	@property
	def wild_signature(self):
		sig = self.signature_set.filter(format=enums.FormatType.FT_WILD).latest()
		return {
			"as_of": sig.as_of,
			"format": int(sig.format),
			"components": [(c.card_id, c.weight) for c in sig.components.all()],
		}

	def get_absolute_url(self):
		return reverse("archetype_detail", kwargs={"id": self.id, "slug": slugify(self.name)})

	def is_configured_for_format(self, game_format):
		num_training = len(ArchetypeTrainingDeck.objects.get_training_decks_for_archetype(
			self,
			game_format,
			is_validation_deck=False
		))
		num_validation = len(ArchetypeTrainingDeck.objects.get_training_decks_for_archetype(
			self,
			game_format,
			is_validation_deck=True
		))
		has_min_training_decks = num_training >= self.MINIMUM_REQUIRED_TRAINING_DECKS
		has_min_validation_decks = num_validation >= self.MINIMUM_REQUIRED_VALIDATION_DECKS
		return has_min_training_decks and has_min_validation_decks

	def distance(self, deck, game_format):
		signature = self.get_signature(game_format)
		if signature:
			return signature.distance(deck)

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


class ArchetypeTrainingDeckManager(models.Manager):
	TRAINING_DECK_IDS_QUERY = """
		SELECT
			d.id AS deck_id
		FROM decks_archetypetrainingdeck t
		JOIN cards_deck d ON d.id = t.deck_id
		WHERE t.is_validation_deck = {is_validation}
		"""

	def _get_decks(self, is_validation_deck):
		with connection.cursor() as cursor:
			cursor.execute(
				self.TRAINING_DECK_IDS_QUERY.format(is_validation=is_validation_deck)
			)
			deck_ids = [record["deck_id"] for record in dictfetchall(cursor)]
			return Deck.objects.filter(id__in=deck_ids)

	def get_training_decks_for_archetype(self, archetype, game_format, is_validation_deck):
		result = []
		training_decks = self._get_training_decks(
			game_format,
			archetype.player_class,
			is_validation_deck
		)
		for td in training_decks:
			if td.archetype == archetype:
				result.append(td)
		return result

	def get_training_decks(self, game_format, player_class):
		return self._get_training_decks(game_format, player_class, is_validation_deck=False)

	def get_validation_decks(self, game_format, player_class):
		return self._get_training_decks(game_format, player_class, is_validation_deck=True)

	def _get_training_decks(self, game_format, player_class, is_validation_deck):
		result = []
		for deck in self._get_decks(is_validation_deck):
			if deck.format == game_format and deck.deck_class == player_class:
				result.append(deck)
		return result


class ArchetypeTrainingDeck(models.Model):
	objects = ArchetypeTrainingDeckManager()
	deck = models.ForeignKey(Deck, on_delete=models.PROTECT)
	is_validation_deck = models.BooleanField()


class Signature(models.Model):
	id = models.AutoField(primary_key=True)
	archetype = models.ForeignKey(
		Archetype, on_delete=models.CASCADE
	)
	format = IntEnumField(enum=enums.FormatType, default=enums.FormatType.FT_STANDARD)
	as_of = models.DateTimeField()

	class Meta:
		get_latest_by = "as_of"

	def __str__(self):
		return "Signature for %s (%s)" % (self.archetype, self.format.name)

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
		Signature, on_delete=models.CASCADE, related_name="components",
	)
	card = models.ForeignKey(
		Card, on_delete=models.PROTECT, to_field="dbf_id", db_column="card_dbf_id",
		related_name="signature_components",
	)
	weight = models.FloatField(default=0.0)
