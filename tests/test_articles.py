import pytest
from hsreplaynet.articles.markdown.macros import do_card
from hsreplaynet.cards.models import Card


@pytest.mark.django_db
def test_card_macro():
	card_id = "EX1_001"
	card_name = "Lightwarden"
	card = Card.objects.get(id=card_id)
	card_url = card.get_absolute_url()
	card_art = card.get_card_art_url()

	html = card_name
	assert do_card(id=card_id, render=False, link=False) == html
	assert do_card(name=card_name, render=False, link=False) == html

	html = '<a href="%s" data-card-id="%s">%s</a>' % (card_url, card_id, card_name)
	assert do_card(id=card_id, render=False, link=True, tooltip=False) == html

	html = '<a href="%s" data-card-id="%s">%s</a>' % (card_url, card_id, "Foo")
	assert do_card(id=card_id, render=False, link=True, tooltip=False, name="Foo") == html

	html = '<a href="%s" data-card-id="%s" data-toggle="card-tooltip">%s</a>' % (
		card_url, card_id, card_name
	)
	assert do_card(id=card_id, render=False, link=True, tooltip=True) == html

	html = '<img src="%s" alt="%s"/>' % (card_art, card_name)
	assert do_card(id=card_id, render=True, link=False) == html

	html = '<a href="%s" data-card-id="%s"><img src="%s" alt="%s"/></a>' % (
		card_url, card_id, card_art, card_name
	)
	assert do_card(id=card_id, render=True, link=True) == html
