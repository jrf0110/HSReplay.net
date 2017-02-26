from locators import DeckDatabaseLocators, DeckDetailLocators
from selenium.webdriver.common.keys import Keys


class BasePage:
	IMAGE_LOADED_VALIDATOR = """return arguments[0].complete &&
								typeof arguments[0].naturalWidth != \"undefined\" &&
								arguments[0].naturalWidth > 0"""

	def __init__(self, driver):
		self.driver = driver


class DeckDatabase(BasePage):
	""" A Selenium Page Object For Testing

	For an introduction to the page design pattern, see:
		http://selenium-python.readthedocs.io/page-objects.html
	"""

	@property
	def deck_list_rows(self):
		return self.driver.find_elements(*DeckDatabaseLocators.DECK_LIST_ROWS)

	def search_for_included_card_named(self, card_name):
		search_box = self.driver.find_element(*DeckDatabaseLocators.INCLUDED_CARDS_SEARCH_BOX)
		search_box.clear()
		search_box.send_keys(card_name)
		search_box.send_keys(Keys.ARROW_DOWN)
		search_box.send_keys(Keys.RETURN)

	def click_deck_row_number(self, row_num):
		deck_row = self.deck_list_rows[row_num]
		deck_name = deck_row.find_element(*DeckDatabaseLocators.DECK_ROW_DECK_NAME)
		deck_name.click()


class DeckDetail(BasePage):

	@property
	def card_wrappers(self):
		return self.driver.find_elements(*DeckDetailLocators.CARD_WRAPPERS)

	@property
	def card_names(self):
		result = []
		for card_wrapper in self.card_wrappers:
			card_name = card_wrapper.find_element(*DeckDetailLocators.CARD_NAME)
			result.append(card_name.text)
		return result
