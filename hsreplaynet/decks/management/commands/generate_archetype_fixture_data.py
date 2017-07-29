import json
from django.core.management.base import BaseCommand
from hearthstone.enums import CardClass, FormatType
from hsreplaynet.decks.models import Archetype


class Command(BaseCommand):
	def handle(self, *args, **options):
		data = {
			"archetype_map": {}
		}

		for archetype in Archetype.objects.all():
			data["archetype_map"][archetype.id] = archetype.name

		for game_format in (FormatType.FT_STANDARD, FormatType.FT_WILD):
			data[game_format.name] = {}

			for player_class in CardClass:
				if not player_class.default_hero:
					# non-playable class (TODO: use player_class.is_playable)
					continue

				class_data = {}
				data[game_format.name][player_class.name] = class_data

				class_data["validation"] = Archetype.objects.get_validation_data_for_player_class(
					game_format, player_class
				)
				class_data["training"] = Archetype.objects.get_training_data_for_player_class(
					game_format, player_class
				)

		out_json = json.dumps(data, indent="\t")
		self.stdout.write(out_json)
