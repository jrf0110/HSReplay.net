"""
The following integration tests are intended to be run against
the production environment to detect errors.

For an introduction to selenium:
	http://selenium-python.readthedocs.io/getting-started.html
"""
import pytest
from pages import DeckDatabase, DeckDetail


selenium_test_suite = pytest.mark.skipif(
	not pytest.config.getoption("--selenium"),
	reason="need --smoke option to run"
)


@pytest.mark.skip
@selenium_test_suite
def test_deck_database(browser, full_url):
	browser.get(full_url("deck_list"))
	deck_database = DeckDatabase(browser)

	assert len(deck_database.deck_list_rows) == 12, "Deck list did not contain 12 rows"

	# Now navigate to a deck with the card Backstab
	deck_database.search_for_included_card_named("Backstab")
	deck_database.click_deck_row_number(0)
	deck_detail = DeckDetail(browser)

	# Assert that Backstab is indeed in the selected deck
	assert "Backstab" in deck_detail.card_names, "Backstab is not a card in the selected deck"
