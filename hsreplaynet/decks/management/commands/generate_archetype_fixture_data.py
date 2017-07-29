import json
import os
import subprocess
from datetime import datetime
from django.core.management.base import BaseCommand
from hearthstone.enums import CardClass, FormatType
from hsreplaynet.decks.models import Archetype


TEST_DATA_REPO = "https://github.com/HearthSim/hsreplay-test-data.git"
FIXTURE_BASE = "/tmp/hsreplay-test-data/archetypes"


class Command(BaseCommand):
	def handle(self, *args, **options):
		os.chdir("/tmp")
		if not os.path.exists("/tmp/hsreplay-test-data"):
			proc = subprocess.Popen(["git", "clone", TEST_DATA_REPO])
			proc.wait()
			# git config --global user.name "www-data"
			proc = subprocess.Popen(
				["git", "config", "user.name", "www-data"]
			)
			proc.wait()
			# git config --global user.email www-data@hsreplay.net
			proc = subprocess.Popen(
				["git", "config", "user.email", "www-data@hsreplay.net"]
			)
			proc.wait()

		if not os.path.exists(FIXTURE_BASE):
			os.mkdir(FIXTURE_BASE)

		os.chdir("/tmp/hsreplay-test-data")
		current_ts = datetime.utcnow()

		FIXTURE_DIR = os.path.join(FIXTURE_BASE, current_ts.isoformat())
		os.mkdir(FIXTURE_DIR)

		archetype_map = {}
		for archetype in Archetype.objects.all():
			archetype_map[archetype.id] = archetype.name

		archetype_map_path = os.path.join(FIXTURE_DIR, "archetype_map.json")
		with open(archetype_map_path, "w") as out:
			out.write(json.dumps(archetype_map, indent=4))
		proc = subprocess.Popen(["git", "add", archetype_map_path])
		proc.wait()

		for game_format in (FormatType.FT_STANDARD, FormatType.FT_WILD):
			FORMAT_DIR = os.path.join(FIXTURE_DIR, game_format.name)
			if not os.path.exists(FORMAT_DIR):
				os.mkdir(FORMAT_DIR)

			for player_class in CardClass:
				if CardClass.DRUID <= player_class <= CardClass.WARRIOR:
					training_path = os.path.join(
						FORMAT_DIR,
						"%s_training_decks.json" % player_class.name
					)
					with open(training_path, "w") as out:
						out.write(
							json.dumps(
								Archetype.objects.get_training_data_for_player_class(
									game_format,
									player_class
								),
								indent=4
							)
						)

					proc = subprocess.Popen(["git", "add", training_path])
					proc.wait()

					validation_path = os.path.join(
						FORMAT_DIR,
						"%s_validation_decks.json" % player_class.name
					)
					with open(validation_path, "w") as out:
						out.write(
							json.dumps(
								Archetype.objects.get_validation_data_for_player_class(
									game_format,
									player_class
								),
								indent=4
							)
						)

					proc = subprocess.Popen(["git", "add", validation_path])
					proc.wait()

		msg = "%s archetype fixture data" % (current_ts.isoformat())
		proc = subprocess.Popen(["git", "commit", "-m", msg])
		proc.wait()

		proc = subprocess.Popen(["git", "push"])
		proc.wait()
