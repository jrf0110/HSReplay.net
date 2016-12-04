from math import floor
from django.conf import settings
from django.utils.timezone import now
from hearthstone.enums import BlockType, GameTag, BnetGameType, Step, Zone, CardType
from hearthstone.hslog.export import EntityTreeExporter
from hsreplaynet.utils.influx import get_influx_client, influx_write_payload


class StateSnapshottingExporter(EntityTreeExporter):
	def __init__(self, packet_tree):
		super(StateSnapshottingExporter, self).__init__(packet_tree)
		self.players = {
			1: {},
			2: {},
		}

	def handle_tag_change(self, packet):
		if self.is_main_start(packet):
			self.capture_board_state_snapshot(packet)
		super(StateSnapshottingExporter, self).handle_tag_change(packet)

	def is_main_start(self, packet):
		return packet.tag == GameTag.STEP and packet.value == Step.MAIN_START

	def zone_size_for_player(self, zone, player):
		return sum(1 for e in self.game.in_zone(zone) if e.controller == player)

	def capture_board_state_snapshot(self, packet):
		turn_number = self.game.tags.get(GameTag.TURN, 0)
		current_player = self.game.current_player
		current_player_snapshots = self.players[current_player.player_id]
		snapshot = current_player_snapshots.get(turn_number, {})

		snapshot["secret_info"] = {
			"count": self.zone_size_for_player(Zone.SECRET, current_player)
		}
		snapshot["hand_info"] = {
			"size": self.zone_size_for_player(Zone.HAND, current_player)
		}
		snapshot["weapon_info"] = {
			"weapon_equipped": False
		}
		snapshot["minion_info"] = {
			"minions": []
		}

		for entity in self.game.in_zone(Zone.PLAY):
			if entity.controller == current_player:
				entity_type = entity.tags.get(GameTag.CARDTYPE, CardType.INVALID)

				if entity_type == CardType.MINION:
					cur_health = entity.tags.get(GameTag.HEALTH, 0)
					cur_damage = entity.tags.get(GameTag.DAMAGE, 0),

					snapshot["minion_info"]["minions"].append({
						"card_id": entity.card_id,
						"atk": entity.tags.get(GameTag.ATK, 0),
						"health": cur_health - cur_damage,
						"has_taunt": entity.tags.get(GameTag.TAUNT, False),
						"has_deathrattle": entity.tags.get(GameTag.DEATHRATTLE, False),
					})

				elif entity_type == CardType.WEAPON:
					weapon_info = snapshot["weapon_info"]
					weapon_info["weapon_equipped"] = True
					weapon_info["card_id"] = entity.card_id
					weapon_info["atk"] = entity.tags.get(GameTag.ATK, 0)
					weapon_info["durability"] = entity.tags.get(GameTag.DURABILITY, 0)


class InstrumentedExporter(EntityTreeExporter):
	def __init__(self, packet_tree, meta):
		super(InstrumentedExporter, self).__init__(packet_tree)
		self._payload = []
		self._meta = meta

	def handle_block(self, packet):
		super(InstrumentedExporter, self).handle_block(packet)
		if packet.type == BlockType.PLAY:
			entity = self.game.find_entity_by_id(packet.entity)
			self.record_entity_played(entity)

	def record_entity_played(self, entity):
		timestamp = now()
		player = entity.controller
		if not player:
			return
		player_meta = self._meta.get("player%i" % (player.player_id), {})

		if not player.starting_hero:
			return

		game_type = self._meta.get("game_type", 0)
		try:
			game_type = BnetGameType(game_type).name
		except Exception:
			game_type = "UNKNOWN_%s" % (game_type)

		payload = {
			"measurement": "played_card_stats",
			"tags": {
				"game_type": game_type,
				"card_id": entity.card_id,
			},
			"fields": {
				"rank": self.to_rank_bucket(player_meta.get("rank")),
				"mana": self.to_mana_crystals(player),
				"hero": self.to_hero_class(player),
				"region": player.account_hi,
			},
			"time": timestamp.isoformat()
		}

		self._payload.append(payload)

	def to_hero_class(self, player):
		if player.is_ai:
			return "AI"

		if player.starting_hero:
			card_id = player.starting_hero.card_id or ""
			if card_id.startswith("HERO_"):
				return player.starting_hero.card_id[0:7]
		return "OTHER"

	def to_rank_bucket(self, rank):
		if not rank:
			return None
		elif rank == 0:
			return "LEGEND"
		else:
			min = 1 + floor((rank - 1) / 5) * 5
			max = min + 4
			return "%s-%s" % (min, max)

	def to_mana_crystals(self, player):
		return player.tags.get(GameTag.RESOURCES, 0)

	def write_payload(self, replay_xml_path):
		if not settings.INFLUX_ENABLED:
			return
		# We include the replay_xml_path so that we can more accurately target
		# map-reduce jobs to only process replays where the cards of interest
		# were actually played.
		# Populate the payload with it before writing to influx
		for pl in self._payload:
			pl["fields"]["replay_xml"] = replay_xml_path
		influx = get_influx_client("metastats")
		influx_write_payload(self._payload, client=influx)
