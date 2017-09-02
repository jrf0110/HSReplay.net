import hashlib
import json
import string
from django.conf import settings
from django.contrib.postgres.fields import ArrayField, JSONField
from django.db import connection, models, transaction
from django.dispatch.dispatcher import receiver
from django.urls import reverse
from django.utils import timezone
from django.utils.functional import cached_property
from django.utils.safestring import mark_safe
from django.utils.text import slugify
from django.utils.timezone import now
from django_hearthstone.cards.models import Card
from django_intenum import IntEnumField
from hearthstone import deckstrings, enums
from hsarchetypes import calculate_signature_weights, classify_deck
from hsarchetypes.clustering import (
	ClassClusters, Cluster, ClusterSet, create_cluster_set
)
from shortuuid.main import int_to_string, string_to_int
from hsreplaynet.utils import log
from hsreplaynet.utils.aws.clients import FIREHOSE
from hsreplaynet.utils.aws.redshift import get_redshift_query
from hsreplaynet.utils.cards import card_db
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
		if game_format not in (enums.FormatType.FT_STANDARD, enums.FormatType.FT_WILD):
			return

		qs = Archetype.objects.live().filter(player_class=player_class)
		if game_format == enums.FormatType.FT_STANDARD:
			qs.filter(active_in_standard=True)
		else:
			qs.filter(active_in_wild=True)

		archetype_ids = list(qs.values_list("id", flat=True))

		if not archetype_ids:
			return

		signature_weights = ClusterSnapshot.objects.get_signature_weights(
			game_format,
			player_class,
			archetype_ids
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
		for val in self.includes.values("card__card_class"):
			card_class = val["card__card_class"]
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
		for val in self.includes.values("card__card_set"):
			card_set = val["card__card_set"]
			is_classic = card_set in (enums.CardSet.EXPERT1, enums.CardSet.CORE)
			if not is_classic and not card_set.is_standard:
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

	def dbf_map(self, transformer=int):
		includes = self.includes.values_list("card__dbf_id", "count")
		return {transformer(id): count for id, count in includes}

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

	def live(self):
		return self.filter(deleted=False)

	def get_fully_configured_archetypes(self, game_format, player_class):
		result = []
		archetype_list = Archetype.objects.live().filter(
			player_class=player_class
		).all()
		for a in archetype_list:
			if game_format == enums.FormatType.FT_STANDARD and a.active_in_standard:
				result.append(a)

			if game_format == enums.FormatType.FT_WILD and a.active_in_wild:
				result.append(a)

		return result

	def get_signature_weights(self, archetype_ids, game_format):
		archetype_ids_sql_list = ",".join(str(id) for id in archetype_ids)
		query = self.SIGNATURE_COMPONENTS_QUERY_TEMPLATE.format(
			archetype_ids=archetype_ids_sql_list,
			format=str(int(game_format))
		)
		with connection.cursor() as cursor:
			cursor.execute(query)
			result = {}
			for record in dictfetchall(cursor):
				if record["archetype_id"] not in result:
					result[record["archetype_id"]] = {}
				result[record["archetype_id"]][record["card_dbf_id"]] = record["weight"]
			return result

	def _list_decks_from_redshift_for_format(self, game_format):
		query = get_redshift_query("list_decks_by_win_rate")
		if game_format == enums.FormatType.FT_STANDARD:
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

	def _get_deck_archetype_map_from_redshift(self, game_format):
		data = self._list_decks_from_redshift_for_format(game_format)

		deck_archetype_map = {}
		for player_class, decks in data.items():
			for deck in decks:
				deck_archetype_map[deck["digest"]] = deck["archetype_id"]

		return deck_archetype_map

	def _get_deck_observation_counts_from_redshift(self, game_format):
		data = self._list_decks_from_redshift_for_format(game_format)
		observations = {}
		for player_class, decks in data.items():
			for deck in decks:
				observations[deck["digest"]] = deck["total_games"]

		return observations

	def current_cluster_set(self, game_format=enums.FormatType.FT_STANDARD):
		from hsarchetypes.clustering import ClassClusters, ClusterSet
		class_clusters = []
		for player_class in enums.CardClass:
			if enums.CardClass.DRUID <= player_class <= enums.CardClass.WARRIOR:
				clusters = []
				qs = Archetype.objects.live()

				if game_format == enums.FormatType.FT_STANDARD:
					qs = qs.filter(active_in_standard=True)

				if game_format == enums.FormatType.FT_WILD:
					qs = qs.filter(active_in_wild=True)

				archetypes_list = qs.filter(
					player_class=player_class
				).all()

				for archetype in archetypes_list:
					archtype_cluster = archetype.to_cluster(game_format=game_format)
					if archtype_cluster:
						clusters.append(archtype_cluster)
				class_clusters.append(ClassClusters(player_class.name, clusters))

		return ClusterSet(class_clusters)

	def update_all_signatures(self, dryrun=True):
		from hsarchetypes.clustering import ClusterSet
		from hsreplaynet.analytics.processing import get_cluster_set_data

		game_format = enums.FormatType.FT_STANDARD
		cluster_set_data = get_cluster_set_data(game_format)
		if cluster_set_data:
			cluster_set = ClusterSet.create_cluster_set(cluster_set_data)
			previous_cluster_set = self.current_cluster_set(game_format)
			cluster_set.inherit_from_previous(previous_cluster_set)

			prefix, sep, suffix = game_format.name.partition("_")

			with transaction.atomic():
				current_ts = timezone.now()
				for class_cluster in cluster_set.class_clusters:
					log.info("%s: Class Cluster: %s" % (suffix, str(class_cluster)))

					for cluster in class_cluster.clusters:
						if cluster.external_id:
							archetype = Archetype.objects.live().get(
								id=cluster.external_id
							)
							vals = (suffix, archetype.name, archetype.id)
							log.info(
								"%s: Update Existing Archetype: %s (%i)" % vals
							)
							old_string = archetype.get_signature(
								game_format
							).pretty_signature_string("\n")
							log.info(
								"%s: OLD Signature:\n%s" % (suffix, old_string)
							)
							new_string = cluster.pretty_signature_string("\n")
							log.info(
								"%s: NEW Signature:\n%s" % (suffix, new_string)
							)
							if not dryrun:
								signature = Signature.objects.create(
									archetype=archetype,
									format=game_format,
									as_of=current_ts
								)
								for dbf_id, weight in cluster.signature.items():
									SignatureComponent.objects.create(
										signature=signature,
										card_id=int(dbf_id),
										weight=weight
									)
						else:
							# Create a new Archetype
							name = cluster.pretty_signature_string(", ")[:249]
							log.info(
								"%s: Create New Archetype: %s" % (suffix, name)
							)
							new_string = cluster.pretty_signature_string("\n")
							log.info(
								"%s: NEW Signature:\n%s" % (suffix, new_string)
							)
							if not dryrun:
								archetype = Archetype.objects.create(
									name=name,
									player_class=enums.CardClass[class_cluster.player_class]
								)
								signature = Signature.objects.create(
									archetype=archetype,
									format=game_format,
									as_of=current_ts
								)
								for dbf_id, weight in cluster.signature.items():
									SignatureComponent.objects.create(
										signature=signature,
										card_id=int(dbf_id),
										weight=weight
									)

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

		new_weights = calculate_signature_weights(training_data, thresholds)

		validation_data = self.get_validation_data_for_player_class(game_format, player_class)

		if self.new_weights_pass_validation(new_weights, validation_data):
			with transaction.atomic():
				current_ts = timezone.now()
				for archetype_id, weights in new_weights.items():
					archetype = Archetype.objects.live().get(id=int(archetype_id))
					signature = Signature.objects.create(
						archetype=archetype, format=game_format, as_of=current_ts
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

		configured_archetypes = self.get_fully_configured_archetypes(
			game_format,
			player_class
		)

		training_data = {}
		for deck in training_decks:
			if deck.archetype not in configured_archetypes:
				continue

			if deck.archetype.id not in training_data:
				training_data[deck.archetype.id] = []
			if deck.digest not in training_data[deck.archetype.id]:
				if deck.digest in observation_counts:
					training_data[deck.archetype.id].append({
						"total_games": observation_counts[deck.digest],
						"cards": deck.dbf_map()
					})
		return training_data

	def get_validation_data_for_player_class(self, game_format, player_class):
		observation_counts = self._get_deck_observation_counts_from_redshift(game_format)
		validation_decks = ArchetypeTrainingDeck.objects.get_validation_decks(
			game_format,
			player_class
		)

		configured_archetypes = self.get_fully_configured_archetypes(
			game_format,
			player_class
		)

		validation_data = {}
		for deck in validation_decks:
			if deck.archetype not in configured_archetypes:
				continue

			if deck.archetype.id not in validation_data:
				validation_data[deck.archetype.id] = []
			if deck.digest not in validation_data[deck.archetype.id]:
				if deck.digest in observation_counts:
					validation_data[deck.archetype.id].append({
						"total_games": observation_counts[deck.digest],
						"cards": deck.dbf_map()
					})
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

	id = models.BigAutoField(primary_key=True)
	objects = ArchetypeManager()
	name = models.CharField(max_length=250, blank=True)
	player_class = IntEnumField(enum=enums.CardClass, default=enums.CardClass.INVALID)
	active_in_standard = models.BooleanField(default=False)
	active_in_wild = models.BooleanField(default=False)
	deleted = models.BooleanField(default=False)

	class Meta:
		db_table = "cards_archetype"

	def __str__(self):
		return self.name

	@property
	def standard_cluster(self):
		return ClusterSnapshot.objects.get_live_cluster_for_archetype(
			enums.FormatType.FT_STANDARD,
			self
		)

	@property
	def wild_cluster(self):
		return ClusterSnapshot.objects.get_live_cluster_for_archetype(
			enums.FormatType.FT_WILD,
			self
		)

	@property
	def standard_signature(self):
		cluster = self.standard_cluster
		return {
			"as_of": cluster.class_cluster.cluster_set.as_of,
			"format": int(cluster.class_cluster.cluster_set.game_format),
			"components": [(int(dbf_id), weight) for dbf_id, weight in cluster.signature.items()],
		}

	@property
	def wild_signature(self):
		cluster = self.wild_cluster
		return {
			"as_of": cluster.class_cluster.cluster_set.as_of,
			"format": int(cluster.class_cluster.cluster_set.game_format),
			"components": [(int(dbf_id), weight) for dbf_id, weight in cluster.signature.items()],
		}

	@property
	def standard_signature_pretty(self):
		cluster = self.standard_cluster
		if cluster:
			return cluster.pretty_signature_string()
		return ""

	@property
	def wild_signature_pretty(self):
		cluster = self.wild_cluster
		if cluster:
			return cluster.pretty_signature_string()
		else:
			return ""

	@property
	def wild_training_decks_count(self):
		return len(ArchetypeTrainingDeck.objects.get_training_decks_for_archetype(
			self,
			enums.FormatType.FT_WILD,
			is_validation_deck=False
		))

	@property
	def standard_training_decks_count(self):
		return len(ArchetypeTrainingDeck.objects.get_training_decks_for_archetype(
			self,
			enums.FormatType.FT_STANDARD,
			is_validation_deck=False
		))

	@property
	def wild_validation_decks_count(self):
		return len(ArchetypeTrainingDeck.objects.get_training_decks_for_archetype(
			self,
			enums.FormatType.FT_WILD,
			is_validation_deck=True
		))

	@property
	def standard_validation_decks_count(self):
		return len(ArchetypeTrainingDeck.objects.get_training_decks_for_archetype(
			self,
			enums.FormatType.FT_STANDARD,
			is_validation_deck=True
		))

	@property
	def wild_signature_as_of(self):
		cluster = self.wild_cluster
		if cluster:
			return cluster.class_cluster.cluster_set.as_of
		else:
			return None

	@property
	def standard_signature_as_of(self):
		cluster = self.standard_cluster
		if cluster:
			return cluster.class_cluster.cluster_set.as_of
		else:
			return None

	def get_absolute_url(self):
		return reverse("archetype_detail", kwargs={"id": self.id, "slug": slugify(self.name)})

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

	def to_cluster(self, game_format=enums.FormatType.FT_STANDARD):
		from hsarchetypes.clustering import Cluster
		signature = self.get_signature(game_format=game_format)
		# decks = ArchetypeTrainingDeck.objects.get_training_decks_for_archetype(
		# 	self,
		# 	game_format,
		# 	is_validation_deck=False
		# )
		if signature:
			return Cluster(
				cluster_id=None,
				decks=None,
				signature=signature.to_dbf_map(),
				name=self.name,
				external_id=self.id
			)
		else:
			return None


class ArchetypeTrainingDeckManager(models.Manager):
	TRAINING_DECK_IDS_QUERY = """
		SELECT
			i.deck_id,
			CASE
				WHEN sum(CASE WHEN c.card_set IN ({wild_sets}) THEN 1 ELSE 0 END) > 0
				THEN True
				ELSE False
			END AS is_wild
		FROM decks_archetypetrainingdeck t
		JOIN cards_include i ON i.deck_id = t.deck_id
		JOIN card c ON c.card_id = i.card_id
		WHERE t.is_validation_deck = {is_validation}
		AND c.card_class = {card_class}
		GROUP BY i.deck_id;
	"""

	def _get_decks(self, game_format, player_class, is_validation_deck):
		wild_sets = [c for c in enums.CardSet if c.craftable and not c.is_standard]
		wild_set_ids = ", ".join(str(c.value) for c in wild_sets)

		with connection.cursor() as cursor:
			cursor.execute(
				self.TRAINING_DECK_IDS_QUERY.format(
					is_validation=is_validation_deck,
					card_class=player_class.value,
					wild_sets=wild_set_ids
				)
			)
			deck_ids = []
			is_wild = game_format == enums.FormatType.FT_WILD
			for record in dictfetchall(cursor):
				if is_wild == record["is_wild"]:
					deck_ids.append(record["deck_id"])

			return list(Deck.objects.filter(id__in=deck_ids))

	def get_training_decks_for_archetype(self, archetype, game_format, is_validation_deck):
		result = []
		training_decks = self._get_decks(
			game_format,
			archetype.player_class,
			is_validation_deck
		)
		for td in training_decks:
			if td.archetype_id == archetype.id:
					result.append(td)
		return result

	def get_training_decks(self, game_format, player_class):
		return self._get_decks(game_format, player_class, is_validation_deck=False)

	def get_validation_decks(self, game_format, player_class):
		return self._get_decks(game_format, player_class, is_validation_deck=True)


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
		return "Signature for %s (%s)" % (self.archetype, self.format)

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
			result[str(component.card.dbf_id)] = component.weight
		return result

	def pretty_signature_string(self, sep=", "):
		components = {}
		for component in self.components.select_related("card").all():
			components[component.card.name] = component.weight
		sorted_components = sorted(components.items(), key=lambda t: t[1], reverse=True)
		return sep.join(["%s - %s" % (n, str(round(w, 2))) for n, w in sorted_components])


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


class ClusterSetManager(models.Manager):
	def snapshot(self, game_format=enums.FormatType.FT_STANDARD):
		from hsreplaynet.analytics.processing import get_cluster_set_data

		data = get_cluster_set_data(game_format=game_format)

		with transaction.atomic():
			cs_snapshot = create_cluster_set(data, factory=ClusterSetSnapshot)
			previous_snapshot = ClusterSetSnapshot.objects.filter(
				live_in_production=True
			).first()
			cs_snapshot.inherit_from_previous(previous_snapshot)

			ClusterSetSnapshot.objects.update(latest=False)
			cs_snapshot.game_format = game_format
			cs_snapshot.latest = True
			cs_snapshot.save()

			for class_cluster in cs_snapshot.class_clusters:
				class_cluster.cluster_set = cs_snapshot
				class_cluster.save()

				for cluster in class_cluster.clusters:
					cluster.class_cluster = class_cluster
					cluster.save()

		return cs_snapshot


class ClassClusterSnapshot(models.Model, ClassClusters):
	id = models.AutoField(primary_key=True)
	cluster_set = models.ForeignKey("ClusterSetSnapshot", on_delete=models.CASCADE)
	player_class = IntEnumField(enum=enums.CardClass, default=enums.CardClass.INVALID)

	def __str__(self):
		return ClassClusters.__str__(self)

	@property
	def clusters(self):
		if not hasattr(self, "_clusters"):
			self._clusters = list(self.clustersnapshot_set.all())
		return self._clusters

	@clusters.setter
	def clusters(self, clusters):
		self._clusters = clusters
		for cluster in clusters:
			cluster.class_cluster = self


class ClusterManager(models.Manager):
	LIVE_SIGNATURES_QUERY = """
		SELECT
			c.external_id,
			c.ccp_signature
		FROM decks_clustersetsnapshot cs
		JOIN decks_classclustersnapshot ccs ON ccs.cluster_set_id = cs.id
		JOIN decks_clustersnapshot c ON c.class_cluster_id = ccs.id
		WHERE cs.live_in_production = True
		AND cs.game_format = %s
		AND ccs.player_class = %s;
	"""

	def get_signature_weights(self, game_format, player_class, archetype_ids):
		with connection.cursor() as cursor:
			cursor.execute(
				self.LIVE_SIGNATURES_QUERY % (int(game_format), int(player_class))
			)
			result = {}
			for record in dictfetchall(cursor):
				if record["external_id"] in archetype_ids:
					if record["external_id"] not in result and record["external_id"]:
						result[record["external_id"]] = {}
					for dbf_id, weight in record["ccp_signature"].items():
						result[record["external_id"]][int(dbf_id)] = weight

			return result

	def get_live_cluster_for_archetype(self, game_format, archetype):
		return ClusterSnapshot.objects.filter(
			class_cluster__player_class=archetype.player_class,
			class_cluster__cluster_set__live_in_production=True,
			class_cluster__cluster_set__game_format=game_format,
			external_id=archetype.id
		).first()

	def get_live_signature_for_archetype(self, game_format, archetype, ccp_version=False):
		cluster = self.get_live_cluster_for_archetype(game_format, archetype)
		if not cluster:
			return None

		if ccp_version:
			return cluster.ccp_signature
		else:
			return cluster.signature


class ClusterSnapshot(models.Model, Cluster):
	id = models.AutoField(primary_key=True)
	objects = ClusterManager()
	class_cluster = models.ForeignKey(ClassClusterSnapshot, on_delete=models.CASCADE)
	cluster_id = models.IntegerField()
	experimental = models.BooleanField(default=False)
	signature = JSONField(default=dict)
	name = models.CharField(max_length=250, blank=True)
	rules = ArrayField(
		base_field=models.CharField(max_length=100, blank=True),
		default=list
	)
	data_points = JSONField(default=list)
	external_id = models.IntegerField(null=True, blank=True)
	ccp_signature = JSONField(default=dict)

	def __str__(self):
		return Cluster.__str__(self)

	@property
	def archetype(self):
		if self.external_id:
			return Archetype.objects.get(id=self.external_id)
		else:
			return None

	@property
	@mark_safe
	def pretty_signature_html(self):
		db = card_db()
		components = list(sorted(self.signature.items(), key=lambda t: t[1], reverse=True))
		table = "<table><tr><th>Card</th><th>Weight</th></tr>%s</table>"
		row = "<tr><td>%s</td><td>%s</td></tr>"
		rows = [row % (db[int(dbf)].name, round(weight, 4)) for dbf, weight in components]
		return table % "".join(rows)


class ClusterSetSnapshot(models.Model, ClusterSet):
	id = models.AutoField(primary_key=True)
	objects = ClusterSetManager()
	as_of = models.DateTimeField(default=timezone.now)
	game_format = IntEnumField(enum=enums.FormatType, default=enums.FormatType.FT_STANDARD)
	live_in_production = models.BooleanField(default=False)
	latest = models.BooleanField(default=False)

	CLASS_CLUSTER_FACTORY = ClassClusterSnapshot
	CLUSTER_FACTORY = ClusterSnapshot

	class Meta:
		get_latest_by = "as_of"

	def __str__(self):
		return ClusterSet.__str__(self)

	@property
	def class_clusters(self):
		if not hasattr(self, "_class_clusters"):
			self._class_clusters = list(self.classclustersnapshot_set.all())
		return self._class_clusters

	@class_clusters.setter
	def class_clusters(self, cc):
		self._class_clusters = cc
		for class_cluster in cc:
			class_cluster.cluster_set = self

	def update_archetype_signatures(self):
		with transaction.atomic():
			ClusterSetSnapshot.objects.filter(
				live_in_production=True
			).update(live_in_production=False)
			self.live_in_production = True
			self.save()
