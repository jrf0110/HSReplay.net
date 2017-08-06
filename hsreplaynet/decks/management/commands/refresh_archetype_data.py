from django.conf import settings
from django.core.management.base import BaseCommand
from hsreplaynet.analytics.processing import write_messages_to_queue
from hsreplaynet.utils.aws.redshift import get_redshift_catalogue


class Command(BaseCommand):
	def handle(self, *args, **options):
		catalogue = get_redshift_catalogue()
		queue_name = settings.REDSHIFT_ANALYTICS_QUERY_QUEUE_NAME
		queries = []
		for name, query in catalogue.registry.items():
			if query.uses_archetypes:
				query.mark_all_stale()
				if name in settings.ARCHETYPE_QUERIES_FOR_IMMEDIATE_REFRESH:
					for permutation in query.generate_cachable_parameter_permutations():
						queries.append({
							"query_name": query.name,
							"supplied_parameters": permutation
						})
		write_messages_to_queue(queue_name, queries)
