import hashlib
import string


ALPHABET = string.ascii_letters + string.digits


def int_to_string(number, alphabet, padding=None):
	"""
	Convert a number to a string, using the given alphabet.
	"""
	output = ""
	alpha_len = len(alphabet)
	while number:
		number, digit = divmod(number, alpha_len)
		output += alphabet[digit]
	if padding:
		remainder = max(padding - len(output), 0)
		output = output + alphabet[0] * remainder
	return output


def generate_digest_from_deck_list(id_list):
	sorted_cards = sorted(id_list)
	m = hashlib.md5()
	m.update(",".join(sorted_cards).encode("utf-8"))
	return m.hexdigest()


if __name__ == "__main__":
	# [Grimscale Chum x 2, Murloc Tidecaller x 2, Vilefin Inquisitor x 2,
	# Bluegill Warrior x 2, Hydrologist x 2, Rockpool Hunter x 2, Coldlight Seer x 2,
	# Divine Favor x 1, Murloc Warleader x 2, Blessing of Kings x 2, Consecration x 2,
	# Gentle Megasaur x 2, Truesilver Champion x 2, Finja, the Flying Star x 1,
	# Stampeding Kodo x 1, Spikeridged Steed x 1, Sunkeeper Tarim x 1, Tirion Fordring x 1]

	card_ids = [
		"UNG_952", "UNG_015", "CS2_093", "CS2_093", "EX1_507", "EX1_507", "EX1_509",
		"EX1_509", "UNG_089", "UNG_089", "EX1_103", "EX1_103", "NEW1_041", "CFM_650",
		"CFM_650", "CS2_173", "CS2_173", "EX1_349", "EX1_383", "CS2_097", "CS2_097",
		"CFM_344", "UNG_073", "UNG_073", "OG_006", "OG_006", "CS2_092", "CS2_092",
		"UNG_011", "UNG_011"
	]

	digest = generate_digest_from_deck_list(card_ids)
	shortid = int_to_string(int(digest, 16), ALPHABET)

	print("The ShortID is: %s" % shortid)
	print("https://hsreplay.net/decks/%s/" % shortid)
