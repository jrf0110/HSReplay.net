import json
from django.urls import reverse
from django.conf import settings
from hsredshift.analytics import queries
from hsreplaynet.cards.models import Card
from django.http import HttpResponse
from sqlalchemy import create_engine


# Create your views here.
def run_query(request, name):
	conn_info = settings.REDSHIFT_CONNECTION
	engine = create_engine(conn_info)
	query = queries.get_query(name)
	params = {}
	for param_name, converter in query.params():
		if param_name in request.GET:
			params[param_name] = converter(request.GET[param_name])

	results = query.as_result_set().execute(engine, params)

	chart_series_data = query.to_chart_series(params, results)

	result = {
		"render_as": query.display_visual.name.lower(),
		"label_x": query.label_x,
		"label_y": query.label_y,
		"title": query.title,
		"series": chart_series_data
	}

	payload_str = json.dumps(result, indent=4, sort_keys=True)
	return HttpResponse(payload_str, content_type="application/json")


def card_inventory(request, card_id):
	result = []
	card = Card.objects.get(id=card_id)
	for query in queries.card_inventory(card):
		query = {
			"endpoint": reverse("analytics_run_query", kwargs={"name": query.name}),
			"params": list(query.params().keys())
		}
		result.append(query)

	payload_str = json.dumps(result, indent=4, sort_keys=True)
	return HttpResponse(payload_str, content_type="application/json")
