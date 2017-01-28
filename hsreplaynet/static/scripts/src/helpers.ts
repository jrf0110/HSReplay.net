export function staticFile(file: string) {
	return STATIC_URL + file;
}

export function joustStaticFile(file: string) {
	return JOUST_STATIC_URL + file;
}

export function image(image: string) {
	return staticFile("images/" + image);
}

export function joustAsset(asset: string) {
	return joustStaticFile("assets/" + asset);
}

export function cardArt(cardArt: string) {
	return HEARTHSTONE_ART_URL + cardArt + ".jpg";
}

export function toTitleCase(str: string) {
	return str.substr(0, 1).toUpperCase() + str.substr(1, str.length - 1).toLowerCase();
}

export function getHeroColor(hero: string): string {
	if (!hero) {
		return;
	}
	switch (hero.toUpperCase()) {
		case "DRUID": return "#FF7D0A";
		case "HUNTER": return "#ABD473";
		case "MAGE": return "#69CCF0";
		case "PALADIN": return "#F58CBA";
		case "PRIEST": return "#D2D2D2";
		case "ROGUE": return "#FFF01a";
		case "SHAMAN": return "#0070DE";
		case "WARLOCK": return "#9482C9";
		case "WARRIOR": return "#C79C6E";
		case "ALL": return "#808080";
		case "NEUTRAL": return "#808080";
	}
}
