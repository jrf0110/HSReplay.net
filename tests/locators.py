from selenium.webdriver.common.by import By


class SitewideLocators(object):
	ACCOUNT_DETAILS = (By.ID, 'you')


class AccountDetailLocators(SitewideLocators):
	SIGN_OUT = (By.ID, 'sign-out')
	CONFIRM_SIGN_OUT = (By.XPATH, '/html/body/div[2]/form/button')


class DeckDatabaseLocators(SitewideLocators):
	DECK_LIST_ROWS = (By.XPATH, '//*[@id="deck-discover-container"]/div/div[2]/div/ul/li')
	INCLUDED_CARDS_SEARCH_BOX = (By.XPATH, '//*[@id="deck-discover-infobox"]/div[3]/input')
	DECK_ROW_DECK_NAME = (By.CLASS_NAME, "deck-name")
	PREMIUM_MORE_INFO = (By.XPATH, '//*[@id="deck-discover-infobox"]/div[6]/div[2]/h4/span')
	PREMIUM_SIGNUP_BUTTON = (By.XPATH, '//*[@id="premium-modal"]/div/form/button/span')
	RANK_RANGE_FILTER = (By.XPATH, '//*[@id="deck-discover-infobox"]/div[6]/ul/li')


class DeckDetailLocators(SitewideLocators):
	CARD_WRAPPERS = (By.CLASS_NAME, 'card-wrapper')
	CARD_NAME = (By.CLASS_NAME, 'card-name')


class StripeCheckoutLocators(SitewideLocators):
	CHECKOUT_APP = (By.NAME, 'stripe_checkout_app')
	MODAL = (By.CLASS_NAME, "Modal")


class AdminLoginLocators(object):
	ADMIN_SITE_NAME = (By.ID, "site-name")
	USERNAME_INPUT = (By.ID, "id_username")
	PASSWORD_INPUT = (By.ID, "id_password")
