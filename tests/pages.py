from uuid import uuid4
from locators import (
	DeckDatabaseLocators, DeckDetailLocators, StripeCheckoutLocators, AccountDetailLocators
)
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class BasePage:
	IMAGE_LOADED_VALIDATOR = """return arguments[0].complete &&
								typeof arguments[0].naturalWidth != \"undefined\" &&
								arguments[0].naturalWidth > 0"""

	def __init__(self, driver):
		self.driver = driver

	def _wait_until_clickable_then_click(self, locator):
		element = self.driver.wait_until(locator)
		WebDriverWait(self.driver, 10).until(
			EC.element_to_be_clickable(locator)
		)
		element.click()

	def logout(self):
		account_details = self.driver.wait_until(DeckDatabaseLocators.ACCOUNT_DETAILS)
		account_details.click()
		self._wait_until_clickable_then_click(
			AccountDetailLocators.SIGN_OUT
		)
		self._wait_until_clickable_then_click(
			AccountDetailLocators.CONFIRM_SIGN_OUT
		)


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

	def premium_features_are_locked(self):
		try:
			self.driver.find_element(*DeckDatabaseLocators.PREMIUM_MORE_INFO)
			return True
		except NoSuchElementException	:
			return False

	def click_premium_more_info(self):
		element = self.driver.wait_until(DeckDatabaseLocators.PREMIUM_MORE_INFO)
		element.click()

	def click_premium_signup(self):
		self._wait_until_clickable_then_click(
			DeckDatabaseLocators.PREMIUM_SIGNUP_BUTTON
		)

	def enter_payment_details(self):
		test_email = "test_user_%s@hsreplay.net" % str(uuid4())[:10]
		# We most likely need a WaitUntil here to make sure this doesn't fail

		WebDriverWait(self.driver, 10).until(
			EC.frame_to_be_available_and_switch_to_it('stripe_checkout_app')
		)

		stripe_overlay = self.driver.wait_until(StripeCheckoutLocators.MODAL)
		inputs = stripe_overlay.find_elements_by_tag_name("input")

		for input in inputs:
			placeholder = input.get_property("placeholder")
			if placeholder == 'Email':
				input.clear()
				input.send_keys(test_email)
			elif placeholder == 'Card number':
				input.clear()
				input.send_keys('4242424242424242')
			elif placeholder == 'MM / YY':
				input.clear()
				input.send_keys('0122')
			elif placeholder == 'CVC':
				input.clear()
				input.send_keys('123')
		submit_button = stripe_overlay.find_element_by_tag_name("button")
		submit_button.click()
		return test_email


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
