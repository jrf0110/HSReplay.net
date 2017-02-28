import pytest
from pages import DeckDatabase


selenium_test_suite = pytest.mark.skipif(
	not pytest.config.getoption("--selenium"),
	reason="need --smoke option to run"
)


@selenium_test_suite
def test_premium_signup(browser, full_url):
	browser.get(full_url("deck_list"))
	deck_database = DeckDatabase(browser)

	# First assert that premium features are not available for this user
	assert deck_database.premium_features_are_locked()

	# Then signup for premium
	deck_database.click_premium_more_info()
	deck_database.click_premium_signup()
	deck_database.enter_payment_details()

	# Then assert that premium features are available for this user
	assert deck_database.premium_features_are_locked() is False
