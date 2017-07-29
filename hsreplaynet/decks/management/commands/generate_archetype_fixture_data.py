import json
import os
from django.core.management.base import BaseCommand
from hearthstone.enums import CardClass, FormatType
from hsreplaynet.decks.models import Archetype


class Command(BaseCommand):
	def add_arguments(self, parser):
		parser.add_argument("--out-dir", nargs="?")

	def handle(self, *args, **options):
		fixture_dir = options.get("out_dir") or "."
		fixture_dir = os.path.abspath(fixture_dir)

		if not os.path.exists(fixture_dir):
			os.makedirs(fixture_dir)

		archetype_map = {}
		for archetype in Archetype.objects.all():
			archetype_map[archetype.id] = archetype.name

		archetype_map_path = os.path.join(fixture_dir, "archetype_map.json")
		with open(archetype_map_path, "w") as out:
			json.dump(archetype_map, out, indent="\t")

		for game_format in (FormatType.FT_STANDARD, FormatType.FT_WILD):
			format_dir = os.path.join(fixture_dir, game_format.name)
			if not os.path.exists(format_dir):
				os.makedirs(format_dir)

			for player_class in CardClass:
				if not player_class.default_hero:
					# non-playable class (TODO: use player_class.is_playable)
					continue

				validation_data = Archetype.objects.get_validation_data_for_player_class(
					game_format, player_class
				)
				training_data = Archetype.objects.get_training_data_for_player_class(
					game_format, player_class
				)

				training_path = os.path.join(
					format_dir, "%s_training_decks.json" % (player_class.name.lower())
				)
				with open(training_path, "w") as out:
					self.stdout.write("Writing to %r" % (out.name))
					json.dump(training_data, out, indent="\t")

				validation_path = os.path.join(
					format_dir, "%s_validation_decks.json" % (player_class.name.lower())
				)
				with open(validation_path, "w") as out:
					self.stdout.write("Writing to %r" % (out.name))
					json.dump(validation_data, out, indent="\t")
