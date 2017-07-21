import json
from hashlib import sha1
from io import StringIO
from dateutil.parser import parse as dateutil_parse
from django.conf import settings
from django.core.cache import caches
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db.utils import IntegrityError
from django.utils import timezone
from django_hearthstone.cards.models import Card
from hearthstone.enums import BnetGameType, BnetRegion, CardType, GameTag
from hslog import __version__ as hslog_version, LogParser
from hslog.exceptions import MissingPlayerData, ParsingError
from hslog.export import EntityTreeExporter, FriendlyPlayerExporter
from hsreplay import __version__ as hsreplay_version
from hsreplay.document import HSReplayDocument
from hearthsim_identity.accounts.models import BlizzardAccount
from hsredshift.etl.exceptions import CorruptReplayDataError, CorruptReplayPacketError
from hsredshift.etl.exporters import RedshiftPublishingExporter
from hsredshift.etl.firehose import flush_exporter_to_firehose
from hsreplaynet.decks.models import Deck
from hsreplaynet.uploads.models import UploadEventStatus
from hsreplaynet.utils import guess_ladder_season, log
from hsreplaynet.utils.influx import influx_metric, influx_timer
from hsreplaynet.utils.instrumentation import error_handler
from hsreplaynet.utils.prediction import DeckPrefixTree
from .models import (
	_generate_upload_path, GameReplay, GlobalGame, GlobalGamePlayer, ReplayAlias
)


class ProcessingError(Exception):
	pass


class GameTooShort(ProcessingError):
	pass


class UnsupportedReplay(ProcessingError):
	pass


class ReplayAlreadyExists(ProcessingError):
	def __init__(self, msg, game=None):
		self.game = game


def eligible_for_unification(meta):
	return all([meta.get("game_handle"), meta.get("server_ip")])


def get_replay_url(shortid):
	# Not using get_absolute_url() to avoid tying into Django
	# (not necessarily avail on lambda)
	return "https://hsreplay.net/replay/%s" % (shortid)


def deck_prefix_tree():
	try:
		redis_client = caches["decks"].client.get_client()
		return DeckPrefixTree(redis_client)
	except:
		return None


def get_valid_match_start(match_start, upload_date):
	"""
	Returns a valid match_start value given the match_start and upload_date.
	If the upload_date is greater than the match_start, return the match_start.
	If it's greater than the match_start, return the upload_date, modified to
	use the match_start's timezone.
	"""
	if upload_date > match_start:
		return match_start

	log.info("match_start=%r>upload_date=%r - rejecting match_start", match_start, upload_date)
	return upload_date.astimezone(match_start.tzinfo)


def create_hsreplay_document(parser, entity_tree, meta, global_game):
	hsreplay_doc = HSReplayDocument.from_parser(parser, build=meta["build"])
	game_xml = hsreplay_doc.games[0]
	game_xml.game_type = global_game.game_type
	game_xml.id = global_game.game_handle
	if meta["reconnecting"]:
		game_xml.reconnecting = True

	for player in entity_tree.players:
		player_meta = meta.get("player%i" % (player.player_id), {})
		player_xml = game_xml.players[player.player_id - 1]
		player_xml.rank = player_meta.get("rank")
		player_xml.legendRank = player_meta.get("legend_rank")
		player_xml.cardback = player_meta.get("cardback")
		player_xml.deck = player_meta.get("deck")

	return hsreplay_doc


def save_hsreplay_document(hsreplay_doc, shortid, existing_replay):
	url = get_replay_url(shortid)

	xml_str = hsreplay_doc.to_xml()
	# Add the replay's full URL as a comment
	xml_str += "\n<!-- %s -->\n" % (url)

	return ContentFile(xml_str)


def generate_globalgame_digest(meta, lo1, lo2):
	game_handle = meta["game_handle"]
	server_address = meta["server_ip"]
	values = (game_handle, server_address, lo1, lo2)
	ret = "-".join(str(k) for k in values)
	return sha1(ret.encode("utf-8")).hexdigest()


def find_or_create_global_game(entity_tree, meta):
	ladder_season = meta.get("ladder_season")
	if not ladder_season:
		ladder_season = guess_ladder_season(meta["end_time"])

	defaults = {
		"game_handle": meta.get("game_handle"),
		"server_address": meta.get("server_ip"),
		"server_port": meta.get("server_port"),
		"server_version": meta.get("server_version"),
		"game_type": meta.get("game_type", 0),
		"format": meta.get("format", 0),
		"build": meta["build"],
		"match_start": meta["start_time"],
		"match_end": meta["end_time"],
		"brawl_season": meta.get("brawl_season", 0),
		"ladder_season": ladder_season,
		"scenario_id": meta.get("scenario_id"),
		"num_entities": len(entity_tree.entities),
		"num_turns": entity_tree.tags.get(GameTag.TURN),
		"tainted_decks": False,
	}

	if eligible_for_unification(meta):
		# If the globalgame is eligible for unification, generate a digest
		# and get_or_create the object
		players = entity_tree.players
		lo1, lo2 = players[0].account_lo, players[1].account_lo
		digest = generate_globalgame_digest(meta, lo1, lo2)
		log.debug("GlobalGame digest is %r" % (digest))
		global_game, created = GlobalGame.objects.get_or_create(digest=digest, defaults=defaults)
	else:
		global_game = GlobalGame.objects.create(digest=None, **defaults)
		created = True

	log.debug("Prepared GlobalGame(id=%r), created=%r", global_game.id, created)
	return global_game, created


def get_opponent_revealed_deck(entity_tree, friendly_player_id, game_type):
	for player in entity_tree.players:
		if player.player_id != friendly_player_id:
			decklist = [c.card_id for c in player.initial_deck if c.card_id]

			deck, created = Deck.objects.get_or_create_from_id_list(
				decklist,
				hero_id=player._hero.card_id,
				game_type=game_type,
				classify_into_archetype=True
			)
			log.debug("Opponent revealed deck %i (created=%r)", deck.id, created)
			return deck


def find_or_create_replay(parser, entity_tree, meta, upload_event, global_game, players):
	client_handle = meta.get("client_handle") or None
	existing_replay = upload_event.game
	shortid = existing_replay.shortid if existing_replay else upload_event.shortid
	replay_xml_path = _generate_upload_path(shortid)
	log.debug("Will save replay %r to %r", shortid, replay_xml_path)

	# The user that owns the replay
	user = upload_event.token.user if upload_event.token else None
	friendly_player = players[meta["friendly_player"]]
	opponent_revealed_deck = get_opponent_revealed_deck(
		entity_tree,
		friendly_player.player_id,
		global_game.game_type
	)
	hsreplay_doc = create_hsreplay_document(parser, entity_tree, meta, global_game)

	common = {
		"global_game": global_game,
		"client_handle": client_handle,
		"spectator_mode": meta.get("spectator_mode", False),
		"reconnecting": meta["reconnecting"],
		"friendly_player_id": friendly_player.player_id,
	}
	defaults = {
		"shortid": shortid,
		"aurora_password": meta.get("aurora_password", ""),
		"spectator_password": meta.get("spectator_password", ""),
		"resumable": meta.get("resumable"),
		"build": meta["build"],
		"upload_token": upload_event.token,
		"won": friendly_player.won,
		"replay_xml": replay_xml_path,
		"hsreplay_version": hsreplay_version,
		"hslog_version": hslog_version,
		"upload_ip": upload_event.upload_ip,
		"user_agent": upload_event.user_agent,
		"opponent_revealed_deck": opponent_revealed_deck,
	}

	# Create and save hsreplay.xml file
	# Noop in the database, as it should already be set before the initial save()
	xml_file = save_hsreplay_document(hsreplay_doc, shortid, existing_replay)
	influx_metric("replay_xml_num_bytes", {"size": xml_file.size})

	if existing_replay:
		log.debug("Found existing replay %r", existing_replay.shortid)
		# Clean up existing replay file
		filename = existing_replay.replay_xml.name
		if filename and filename != replay_xml_path and default_storage.exists(filename):
			# ... but only if it's not the same path as the new one (it'll get overwridden)
			log.debug("Deleting %r", filename)
			default_storage.delete(filename)

		# Now update all the fields
		defaults.update(common)
		for k, v in defaults.items():
			setattr(existing_replay, k, v)

		# Save the replay file
		existing_replay.replay_xml.save("hsreplay.xml", xml_file, save=False)

		# Finally, save to the db and exit early with created=False
		existing_replay.save()
		return existing_replay, False

	# No existing replay, so we assign a default user/visibility to the replay
	# (eg. we never update those fields on existing replays)
	# We also prepare a webhook for triggering, if there's one.
	if user:
		defaults["user"] = user
		defaults["visibility"] = user.default_replay_visibility

	if client_handle:
		# Get or create a replay object based on our defaults
		replay, created = GameReplay.objects.get_or_create(defaults=defaults, **common)
		log.debug("Replay %r has created=%r, client_handle=%r", replay.id, created, client_handle)
	else:
		# The client_handle is the minimum we require to update an existing replay.
		# If we don't have it, we won't try deduplication, we instead get_or_create by shortid.
		defaults.update(common)
		replay, created = GameReplay.objects.get_or_create(defaults=defaults, shortid=shortid)
		log.debug("Replay %r has created=%r (no client_handle)", replay.id, created)

	if not created:
		# This can only happen if there is an inconsistency between UploadEvent.game
		# and the processing run.
		# For example, the processing crashed before UploadEvent.save(), or there are
		# multiple processing calls before UploadEvent.game is saved.
		msg = "Replay %r already exists. Try reprocessing (again)." % (shortid)
		raise ReplayAlreadyExists(msg, replay)

	# Save the replay file
	replay.replay_xml.save("hsreplay.xml", xml_file, save=False)

	if replay.shortid != upload_event.shortid:
		# We must ensure an alias for this upload_event.shortid is recorded
		# We use get or create in case this is not the first time processing this replay
		ReplayAlias.objects.get_or_create(replay=replay, shortid=upload_event.shortid)

	if user and not user.is_fake and user.webhook_endpoints.filter(is_deleted=False).exists():
		# Re-query the replay object and create an Event for it
		from hsreplaynet.webhooks.models import Event
		replay = GameReplay.objects.get(id=replay.id)
		event = Event.objects.create(
			user=user, type="replay.created", data=replay.serialize()
		)
		event.create_webhooks()

	return replay, created


def handle_upload_event_exception(e, upload_event):
	"""
	Returns a (status, reraise) tuple.
	The status will be set on the UploadEvent.
	If reraise is True, the exception will bubble up.
	"""
	if isinstance(e, ParsingError):
		return UploadEventStatus.PARSING_ERROR, False
	elif isinstance(e, (GameTooShort, EntityTreeExporter.EntityNotFound, MissingPlayerData)):
		return UploadEventStatus.UNSUPPORTED, False
	elif isinstance(e, UnsupportedReplay):
		return UploadEventStatus.UNSUPPORTED, True
	elif isinstance(e, ValidationError):
		return UploadEventStatus.VALIDATION_ERROR, False
	elif isinstance(e, ReplayAlreadyExists):
		upload_event.game = e.game
		return UploadEventStatus.SERVER_ERROR, False
	else:
		return UploadEventStatus.SERVER_ERROR, True


def process_upload_event(upload_event):
	"""
	Wrapper around do_process_upload_event() to set the event's
	status and error/traceback as needed.
	"""
	upload_event.error = ""
	upload_event.traceback = ""
	if upload_event.status != UploadEventStatus.PROCESSING:
		upload_event.status = UploadEventStatus.PROCESSING
		upload_event.save()

	try:
		replay, do_flush_exporter = do_process_upload_event(upload_event)
	except Exception as e:
		from traceback import format_exc
		upload_event.error = str(e)
		upload_event.traceback = format_exc()
		upload_event.status, reraise = handle_upload_event_exception(e, upload_event)
		metric_fields = {"count": 1}
		if upload_event.game:
			metric_fields["shortid"] = str(upload_event.game.shortid)
		influx_metric(
			"upload_event_exception",
			metric_fields,
			error=upload_event.status.name.lower()
		)
		upload_event.save()
		if reraise:
			raise
		else:
			return
	else:
		upload_event.game = replay
		upload_event.status = UploadEventStatus.SUCCESS
		upload_event.save()

	try:
		with influx_timer("redshift_exporter_flush_duration"):
			do_flush_exporter()
	except Exception as e:
		# Don't fail on this
		error_handler(e)
		influx_metric(
			"flush_redshift_exporter_error",
			{
				"count": 1,
				"error": str(e)
			}
		)

	return replay


def parse_upload_event(upload_event, meta):
	orig_match_start = dateutil_parse(meta["match_start"])
	match_start = get_valid_match_start(orig_match_start, upload_event.created)
	if match_start != orig_match_start:
		upload_event.tainted = True
		upload_event.save()

	log_bytes = upload_event.log_bytes()
	if not log_bytes:
		raise ValidationError("The uploaded log file is empty.")
	influx_metric("raw_power_log_upload_num_bytes", {"size": len(log_bytes)})
	powerlog = StringIO(log_bytes.decode("utf-8"))
	upload_event.file.close()

	parser = LogParser()
	parser._game_state_processor = "GameState"
	parser._current_date = match_start
	parser.read(powerlog)

	return parser


def fetch_active_stream_prefix():
	from hsreplaynet.uploads.models import RedshiftStagingTrack
	prefix = RedshiftStagingTrack.objects.get_active_track_prefix()
	return prefix


def validate_parser(parser, meta):
	# Validate upload
	if len(parser.games) != 1:
		raise ValidationError("Expected exactly 1 game, got %i" % (len(parser.games)))
	packet_tree = parser.games[0]
	with influx_timer("replay_exporter_duration"):
		try:
			exporter = RedshiftPublishingExporter(
				packet_tree,
				stream_prefix=fetch_active_stream_prefix()
			).export()
		except CorruptReplayPacketError as e:
			influx_metric(
				"redshift_exporter_corrupt_data_error", {
					"count": 1,
					"id": e.id,
				},
				corrupt_packet=True,
				packet_class=str(e.packet_class)
			)
			raise ValidationError(str(e))
		except (CorruptReplayDataError, MissingPlayerData) as e:
			influx_metric(
				"redshift_exporter_corrupt_data_error", {
					"count": 1,
					"exception": e.__class__.__name__,
				},
			)
			raise ValidationError(str(e))

	game = exporter.game

	if len(game.players) != 2:
		raise ValidationError("Expected 2 players, found %i" % (len(game.players)))

	for player in game.players:
		# Set the player's name
		player.name = parser.games[0].manager.get_player_by_id(player.id).name
		if player.name is None:
			# If it's None, this is an unsupported replay.
			log.error("Cannot find player %i name. Replay not supported.", player.player_id)
			raise GameTooShort("The game was too short to parse correctly")

		heroes = list(player.heroes)
		if not heroes:
			raise UnsupportedReplay("No hero found for player %r" % (player.name))
		player._hero = heroes[0]

		try:
			db_hero = Card.objects.get(card_id=player._hero.card_id)
		except Card.DoesNotExist:
			raise UnsupportedReplay("Hero %r not found." % (player._hero))
		if db_hero.type != CardType.HERO:
			raise ValidationError("%r is not a valid hero." % (player._hero))

	friendly_player_id = packet_tree.export(cls=FriendlyPlayerExporter)
	if friendly_player_id:
		meta["friendly_player"] = friendly_player_id
	elif "friendly_player" not in meta:
		raise ValidationError("Friendly player ID not present at upload and could not guess it.")

	# We ignore "reconnecting" from the API, we only trust the log.
	# if "reconnecting" not in meta:
	# 	meta["reconnecting"] = False
	# There are two ways of identifying a reconnected game:
	# In reconnected games, the initial CREATE_GAME packet contains a STEP and STATE value.
	# In older versions of HS (pre-13xxx), STATE is RUNNING even in the CREATE_GAME packet.
	# Thankfully, looking at STEP is consistent across all versions, so we use that.
	# It will be Step.INVALID if it's NOT a reconnected game.
	meta["reconnecting"] = not not game.initial_step

	# Add the start/end time to meta dict
	meta["start_time"] = packet_tree.start_time
	meta["end_time"] = packet_tree.end_time

	return game, exporter


def get_player_names(player):
	if not player.is_ai and " " in player.name:
		return "", player.name
	else:
		return player.name, ""


def _is_decklist_superset(superset_decklist, subset_decklist):
	s1 = set(superset_decklist) if superset_decklist else set()
	s2 = set(subset_decklist) if subset_decklist else set()
	return s1.issuperset(s2)


def update_global_players(global_game, entity_tree, meta, upload_event, exporter):
	# Fill the player metadata and objects
	players = {}
	prefix_tree = deck_prefix_tree()
	if prefix_tree:
		play_sequences = exporter.export_play_sequences()
	else:
		play_sequences = None

	for player in entity_tree.players:
		player_meta = meta.get("player%i" % (player.player_id), {})

		is_spectated_replay = meta.get("spectator_mode", False)
		is_friendly_player = player.player_id == meta["friendly_player"]
		decklist_from_meta = player_meta.get("deck")
		decklist_from_replay = [c.card_id for c in player.initial_deck if c.card_id]

		meta_decklist_is_superset = _is_decklist_superset(
			decklist_from_meta,
			decklist_from_replay
		)

		if not decklist_from_meta or is_spectated_replay or not meta_decklist_is_superset:
			# Spectated replays never know more than is in the replay data
			# But may have erroneous data from the spectator's client's memory
			# Read from before they entered the spectated game
			decklist = decklist_from_replay
		else:
			decklist = decklist_from_meta

		name, real_name = get_player_names(player)
		player_hero_id = player._hero.card_id

		try:
			deck, _ = Deck.objects.get_or_create_from_id_list(
				decklist,
				hero_id=player_hero_id,
				game_type=global_game.game_type,
				classify_into_archetype=True
			)
			log.debug("Prepared deck %i (created=%r)", deck.id, _)
		except IntegrityError as e:
			# This will happen if cards in the deck are not in the DB
			# For example, during a patch release
			influx_metric("replay_deck_create_failure", {
				"count": 1,
				"build": meta["build"],
				"global_game_id": global_game.id,
				"server_ip": meta.get("server_ip", ""),
				"upload_ip": upload_event.upload_ip,
				"error": str(e),
			})
			log.exception("Could not create deck for player %r", player)
			global_game.tainted_decks = True
			# Replace with an empty deck
			deck, _ = Deck.objects.get_or_create_from_id_list([])

		if play_sequences:
			try:
				play_sequence_data = play_sequences[player.player_id]
				if deck.size == 30:
					prefix_tree.observe(
						deck.id,
						deck.card_dbf_id_list(),
						play_sequence_data
					)
				else:
					full_deck_id = prefix_tree.lookup(
						deck.card_dbf_id_list(),
						play_sequence_data
					)
					influx_metric("deck_prediction_lookup", {
						"success": full_deck_id is not None,
						"full_deck_id": full_deck_id,
						"deck_id": deck.id,
						"game_id": global_game.id,
						"missing_cards": 30 - deck.size
					})

			except:
				# While prototyping never let failures here disrupt processing
				pass

		# Create the BlizzardAccount first
		defaults = {
			"region": BnetRegion.from_account_hi(player.account_hi),
			"battletag": name,
		}

		if not is_spectated_replay and not player.is_ai and is_friendly_player:
			user = upload_event.token.user if upload_event.token else None
			if user and not user.is_fake:
				# and user.battletag and user.battletag.startswith(player.name):
				defaults["user"] = user

		blizzard_account, created = BlizzardAccount.objects.get_or_create(
			account_hi=player.account_hi, account_lo=player.account_lo,
			defaults=defaults
		)
		if not created and not blizzard_account.user and "user" in defaults:
			# Set BlizzardAccount.user if it's an available claim for the user
			influx_metric("pegasus_account_claimed", {"count": 1})
			blizzard_account.user = defaults["user"]
			blizzard_account.save()

		log.debug("Prepared BlizzardAccount %r", blizzard_account)

		# Now create the GlobalGamePlayer object
		common = {
			"game": global_game,
			"player_id": player.player_id,
		}
		defaults = {
			"is_first": player.tags.get(GameTag.FIRST_PLAYER, False),
			"is_ai": player.is_ai,
			"hero_id": player_hero_id,
			"hero_premium": player._hero.tags.get(GameTag.PREMIUM, False),
			"final_state": player.tags.get(GameTag.PLAYSTATE, 0),
			"extra_turns": player.tags.get(GameTag.EXTRA_TURNS_TAKEN_THIS_GAME, 0),
			"deck_list": deck,
		}

		update = {
			"name": name,
			"real_name": real_name,
			"pegasus_account": blizzard_account,
			"rank": player_meta.get("rank"),
			"legend_rank": player_meta.get("legend_rank"),
			"stars": player_meta.get("stars"),
			"wins": player_meta.get("wins"),
			"losses": player_meta.get("losses"),
			"deck_id": player_meta.get("deck_id") or None,
			"cardback_id": player_meta.get("cardback"),
		}

		defaults.update(update)
		game_player, created = GlobalGamePlayer.objects.get_or_create(defaults=defaults, **common)
		log.debug("Prepared player %r (%i) (created=%r)", game_player, game_player.id, created)

		if not created:
			# Go through the update dict and update values on the player
			# This gets us extra data we might not have had when the player was first created
			updated = False
			for k, v in update.items():
				if v and getattr(game_player, k) != v:
					setattr(game_player, k, v)
					updated = True

			# Skip updating the deck if we already have a bigger one
			# TODO: We should make deck_list nullable and only create it here
			if game_player.deck_list.size is None or len(decklist) > game_player.deck_list.size:
				# XXX: Maybe we should also check friendly_player_id for good measure
				game_player.deck_list = deck
				updated = True

			if updated:
				log.debug("Saving updated player to the database.")
				game_player.save()

		players[player.player_id] = game_player

	return players


def do_process_upload_event(upload_event):
	meta = json.loads(upload_event.metadata)

	# Parse the UploadEvent's file
	parser = parse_upload_event(upload_event, meta)
	# Validate the resulting object and metadata
	entity_tree, exporter = validate_parser(parser, meta)

	# Create/Update the global game object and its players
	global_game, global_game_created = find_or_create_global_game(entity_tree, meta)
	players = update_global_players(global_game, entity_tree, meta, upload_event, exporter)

	# Create/Update the replay object itself
	replay, game_replay_created = find_or_create_replay(
		parser, entity_tree, meta, upload_event, global_game, players
	)

	can_attempt_redshift_load = False

	if global_game.loaded_into_redshift is None:
		log.debug("Global game has not been loaded into redshift.")
		# Attempt to claim the advisory_lock, if successful:
		can_attempt_redshift_load = global_game.acquire_redshift_lock()
	else:
		log.debug("Global game has already been loaded into Redshift")

	# Defer flushing the exporter until after the UploadEvent is set to SUCCESS
	# So that the player can start watching their replay sooner
	def do_flush_exporter():
		# Only if we were able to claim the advisory lock do we proceed here.
		if can_attempt_redshift_load:
			log.debug("Redshift lock acquired. Will attempt to flush to redshift")

			if should_load_into_redshift(upload_event, global_game):
				with influx_timer("generate_redshift_game_info_duration"):
					game_info = get_game_info(global_game, replay)
				exporter.set_game_info(game_info)

				try:
					with influx_timer("flush_exporter_to_firehose_duration"):
						flush_failures_report = flush_exporter_to_firehose(
							exporter,
							records_to_flush=get_records_to_flush()
						)
						for target_table, errors in flush_failures_report.items():
							for error in errors:
								influx_metric(
									"firehose_flush_failure",
									{
										"stream_name": error["stream_name"],
										"error_code": error["error_code"],
										"error_message": error["error_message"],
										"count": 1
									},
									target_table=target_table
								)
				except:
					raise
				else:
					global_game.loaded_into_redshift = timezone.now()
					global_game.save()
					# Okay to release the advisory lock once loaded_into_redshift is set
					# It will also be released automatically when the lambda exits.
					global_game.release_redshift_lock()
		else:
			log.debug("Did not acquire redshift lock. Will not flush to redshift")

	return replay, do_flush_exporter


def get_records_to_flush():
	from hsredshift.etl.records import STAGING_RECORDS
	from hsreplaynet.uploads.models import RedshiftStagingTrack
	active_track = RedshiftStagingTrack.objects.get_active_track()
	staging_records = {r.REDSHIFT_TABLE: r for r in STAGING_RECORDS}
	result = []
	for table in active_track.tables.all():
		if table.target_table in staging_records:
			result.append(staging_records[table.target_table])

	return result


REDSHIFT_GAMETYPE_WHITELIST = (
	BnetGameType.BGT_ARENA,
	BnetGameType.BGT_FRIENDS,
	BnetGameType.BGT_RANKED_STANDARD,
	BnetGameType.BGT_RANKED_WILD,
	BnetGameType.BGT_TAVERNBRAWL_1P_VERSUS_AI,
	BnetGameType.BGT_TAVERNBRAWL_2P_COOP,
	BnetGameType.BGT_TAVERNBRAWL_PVP,
)


def should_load_into_redshift(upload_event, global_game):
	if not settings.ENV_AWS or not settings.REDSHIFT_LOADING_ENABLED:
		return False

	if upload_event.test_data:
		return False

	if global_game.loaded_into_redshift:
		return False

	if global_game.exclude_from_statistics:
		return False

	if global_game.tainted_decks:
		return False

	if global_game.game_type not in REDSHIFT_GAMETYPE_WHITELIST:
		return False

	# We only load games in where the match_start date is within +/ 36 hours from
	# The upload_date. This filters out really old replays people might upload
	# Or replays from users with crazy system clocks.
	# The purpose of this filtering is to do reduce variability and thrash in our vacuuming
	# If we determine that vacuuming is not a bottleneck than we can consider
	# relaxing this requirement.

	upload_date = upload_event.log_upload_date
	match_start = global_game.match_start
	meets_req, diff_hours = _dates_within_etl_threshold(upload_date, match_start)
	if not meets_req:
		influx_metric("replay_failed_recency_requirement", {"count": 1, "diff": diff_hours})
	return meets_req


def _dates_within_etl_threshold(d1, d2):
	threshold_hours = settings.REDSHIFT_ETL_UPLOAD_DELAY_LIMIT_HOURS
	diff = d1 - d2
	diff_hours = abs(diff.total_seconds()) / 3600.0
	within_threshold = diff_hours <= threshold_hours
	return within_threshold, diff_hours


def get_game_info(global_game, replay):
	player1 = replay.player(1)
	player2 = replay.player(2)

	with influx_timer("generate_redshift_player_decklists_duration"):
		player1_decklist = player1.deck_list.as_dbf_json()
		player2_decklist = player2.deck_list.as_dbf_json()

	if settings.REDSHIFT_USE_MATCH_START_AS_GAME_DATE and global_game.match_start:
		game_date = global_game.match_start.date()
	else:
		game_date = timezone.now().date()

	game_info = {
		"game_id": int(global_game.id),
		"shortid": replay.shortid,
		"game_type": int(global_game.game_type),
		"scenario_id": global_game.scenario_id,
		"ladder_season": global_game.ladder_season,
		"brawl_season": global_game.brawl_season,
		"game_date": game_date,
		"players": {
			"1": {
				"deck_id": int(player1.deck_list.id),
				"archetype_id": get_archetype_id(player1),
				"deck_list": player1_decklist,
				"rank": 0 if player1.legend_rank else player1.rank if player1.rank else -1,
				"legend_rank": player1.legend_rank,
				"full_deck_known": player1.deck_list.size == 30
			},
			"2": {
				"deck_id": int(player2.deck_list.id),
				"archetype_id": get_archetype_id(player2),
				"deck_list": player2_decklist,
				"rank": 0 if player2.legend_rank else player2.rank if player2.rank else -1,
				"legend_rank": player2.legend_rank,
				"full_deck_known": player2.deck_list.size == 30,
			},
		}
	}

	return game_info


def get_archetype_id(p):
	return int(p.deck_list.archetype.id) if p.deck_list.archetype else None
