import base64
import os
import subprocess
import pytest
from django.core.management import call_command
from django.utils import timezone
from django_hearthstone.cards.models import Card
from hearthstone.enums import CardClass, FormatType
from hsreplaynet.decks.models import Archetype, Signature, SignatureComponent


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_DATA_DIR = os.path.join(BASE_DIR, "logdata")
LOG_DATA_GIT = "https://github.com/HearthSim/hsreplay-test-data"
UPLOAD_SUITE = os.path.join(LOG_DATA_DIR, "hsreplaynet-tests", "uploads")


def pytest_configure(config):
	if not os.path.exists(LOG_DATA_DIR):
		proc = subprocess.Popen(["git", "clone", LOG_DATA_GIT, LOG_DATA_DIR])
		assert proc.wait() == 0


@pytest.fixture(scope="session")
def django_db_setup(django_db_setup, django_db_blocker):
	with django_db_blocker.unblock():
		call_command("load_cards")


@pytest.mark.django_db
@pytest.yield_fixture(scope="module")
def freeze_mage_archetype():
	signature_components = {
		138: 20,  # Doomsayer
		587: 20,  # Frostnova
		662: 10,  # Frostbolt
		457: 10,  # Blizzard
		749: 10,  # Bloodmage
		251: 10,  # Loothoarder
	}
	archetype, archetype_created = Archetype.objects.get_or_create(
		name="Freeze Mage",
		player_class=CardClass.MAGE
	)
	if archetype_created:
		signature = Signature.objects.create(
			archetype=archetype,
			format=FormatType.FT_STANDARD,
			as_of=timezone.now()
		)
		for dbf_id, weight in signature_components.items():
			SignatureComponent.objects.create(
				signature=signature,
				card=Card.objects.filter(dbf_id=dbf_id).first(),
				weight=weight
			)
	yield archetype


@pytest.mark.django_db
@pytest.yield_fixture(scope="module")
def tempo_mage_archetype():
	signature_components = {
		405: 10,  # Mana Wyrm
		39169: 10,  # Babbling Book
		1941: 10,  # Medivh
		41878: 10,  # Meteor
		40496: 10,  # Kabal Courier
		41683: 10,  # Glutonous Ooze
		39715: 10,  # Firelands Portal
		38418: 10,  # Cabalist's Tomb
	}

	archetype, archetype_created = Archetype.objects.get_or_create(
		name="Tempo Mage",
		player_class=CardClass.MAGE
	)
	if archetype_created:
		signature = Signature.objects.create(
			archetype=archetype,
			format=FormatType.FT_STANDARD,
			as_of=timezone.now()
		)
		for dbf_id, weight in signature_components.items():
			SignatureComponent.objects.create(
				signature=signature,
				card=Card.objects.filter(dbf_id=dbf_id).first(),
				weight=weight
			)
	yield archetype


@pytest.yield_fixture(scope="session")
def upload_context():
	yield None


@pytest.yield_fixture(scope="session")
def upload_event():
	yield {
		"headers": {
			"Authorization": "Token beh7141d-c437-4bfe-995e-1b3a975094b1",
		},
		"body": base64.b64encode('{"player1_rank": 5}'.encode("utf8")).decode("ascii"),
		"source_ip": "127.0.0.1",
	}


@pytest.yield_fixture(scope="session")
def s3_create_object_event():
	yield {
		"Records": [{
			"s3": {
				"bucket": {
					"name": "hsreplaynet-raw-log-uploads",
				},
				"object": {
					"key": "raw/2016/07/20/10/37/hUHupxzE9GfBGoEE8ECQiN/power.log",
				}
			}
		}]
	}
