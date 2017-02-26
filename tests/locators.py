from selenium.webdriver.common.by import By


class DeckDatabaseLocators(object):
	DECK_LIST_ROWS = (By.XPATH, '//*[@id="deck-discover-container"]/div/div[2]/div/ul/li')
	INCLUDED_CARDS_SEARCH_BOX = (By.XPATH, '//*[@id="deck-discover-infobox"]/div[3]/input')
	DECK_ROW_DECK_NAME = (By.CLASS_NAME, "deck-name")


class DeckDetailLocators(object):
	CARD_WRAPPERS = (By.CLASS_NAME, 'card-wrapper')
	CARD_NAME = (By.CLASS_NAME, 'card-name')
