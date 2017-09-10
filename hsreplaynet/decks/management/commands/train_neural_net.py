import os
from uuid import uuid4
from django.core.management.base import BaseCommand
from hsreplaynet.decks.models import ClusterSetSnapshot


class Command(BaseCommand):
	def add_arguments(self, parser):
		parser.add_argument("--num-examples", default=1000000, type=int)
		parser.add_argument("--max-dropped-cards", default=15, type=int)
		parser.add_argument("--stratified", default=False, type=bool)
		parser.add_argument("--min-cards-for-determination", default=5, type=int)
		parser.add_argument("--batch-size", default=1000, type=int)
		parser.add_argument("--num-epochs", default=10, type=int)
		parser.add_argument("--base-layer-size", default=64, type=int)
		parser.add_argument("--hidden-layer-size", default=64, type=int)
		parser.add_argument("--num-hidden-layers", default=2, type=int)
		parser.add_argument("--working-dir", default="", type=str)
		parser.add_argument("--upload-to-s3", default=False, type=bool)

	def handle(self, *args, **options):
		for k, v in options.items():
			self.stdout.write("%s: %s" % (k, v))

		for cluster_set in ClusterSetSnapshot.objects.filter(latest=True):
			if options["working_dir"]:
				working_dir = options["working_dir"]
			else:
				working_dir = os.path.join("/tmp", str(uuid4()))

			cluster_set.train_neural_network(
				num_examples=options["num_examples"],
				max_dropped_cards=options["max_dropped_cards"],
				stratified=options["stratified"],
				min_cards_for_determination=options["min_cards_for_determination"],
				batch_size=options["batch_size"],
				num_epochs=options["num_epochs"],
				base_layer_size=options["base_layer_size"],
				hidden_layer_size=options["hidden_layer_size"],
				num_hidden_layers=options["num_hidden_layers"],
				working_dir=working_dir,
				upload_to_s3=options["upload_to_s3"]
			)
