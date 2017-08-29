from hearthstone.cardxml import load_dbf


_CARD_DB_CACHE = {}


def card_db():
	if "card_db" not in _CARD_DB_CACHE:
		db, _ = load_dbf()
		_CARD_DB_CACHE["card_db"] = db
	return _CARD_DB_CACHE["card_db"]
