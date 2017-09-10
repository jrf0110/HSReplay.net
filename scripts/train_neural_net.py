# flake8: noqa
import os
import time
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hsreplaynet.settings")
os.environ.setdefault("PROD", "1")
os.environ.setdefault("HSREPLAYNET_DEBUG", "1")

django.setup()

from hsreplaynet.decks.models import ClusterSetSnapshot
cs = ClusterSetSnapshot.objects.filter(latest=True).first()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
print(BASE_DIR)

MODELS_DIR = os.path.join(BASE_DIR, "models")

if not os.path.exists(MODELS_DIR):
	os.mkdir(MODELS_DIR)


for num_hidden_layers in (1, 2, 3):
	for hidden_layer_size in (8, 16, 32, 64, 128):
		for base_layer_size in (8, 16, 32, 64, 128):
			for num_examples in (100000, 200000,): #400000, 800000, 1600000, 3200000):
				start_ts = time.time()

				dir_name = "examples_%i_base_%i_layers_%i_hidden_%i" % (num_examples, base_layer_size, num_hidden_layers, hidden_layer_size)
				print("\n\n******** PARAMETERS: %s" % dir_name)
				WORKING_DIR = os.path.join(MODELS_DIR, dir_name)
				os.mkdir(WORKING_DIR)

				cs.train_neural_network(
					num_examples=num_examples,
					max_dropped_cards=5,
					stratified=False,
					min_cards_for_determination=5,
					batch_size=1000,
					num_epochs=20,
					base_layer_size=base_layer_size,
					hidden_layer_size=hidden_layer_size,
					num_hidden_layers=num_hidden_layers,
					working_dir=WORKING_DIR,
					upload_to_s3=True,
					included_classes=["DRUID"]
				)

				end_ts = time.time()
				duration = end_ts - start_ts

				duration_mins = int(duration / 60)
				duration_secs = int(duration % 60)
				print("Training took %i mins %i seconds" % (duration_mins, duration_secs))
