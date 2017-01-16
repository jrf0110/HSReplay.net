import json
from django.urls import reverse
from hsredshift.analytics import queries
from hsreplaynet.cards.models import Card


# Create your views here.
def run_query(request, name):
	pass


def card_inventory(request, card_id):
	result = []
	card = Card.objects.get(id=card_id)
	for query in queries.card_inventory(card):
		query = {
			"endpoint": reverse("analytics_run_query", kwargs={"name": query.name}),
			"params": list(query.params())
		}
		result.append(query)
	return json.dumps(result)
