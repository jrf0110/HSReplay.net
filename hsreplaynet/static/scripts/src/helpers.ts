import * as React from "react";
import {Colors} from "./Colors";
import { ChartMetaData, ChartScheme, ChartSchemeType, ChartSeries, DataPoint } from "./interfaces";

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
	return str && str.substr(0, 1).toUpperCase() + str.substr(1, str.length - 1).toLowerCase();
}

export function getHeroColor(hero: string): string {
	if (!hero) {
		return;
	}
	switch (hero.toUpperCase()) {
		case "DRUID":
			return "#FF7D0A";
		case "HUNTER":
			return "#ABD473";
		case "MAGE":
			return "#69CCF0";
		case "PALADIN":
			return "#F58CBA";
		case "PRIEST":
			return "#D2D2D2";
		case "ROGUE":
			return "#FFF01a";
		case "SHAMAN":
			return "#0070DE";
		case "WARLOCK":
			return "#9482C9";
		case "WARRIOR":
			return "#C79C6E";
		case "ALL":
			return "#808080";
		case "NEUTRAL":
			return "#808080";
	}
}

export function getChartScheme(theme: ChartSchemeType): ChartScheme {
	switch (theme) {
		case "rarity":
			return rarityScheme;
		case "cardtype":
			return cardtypeScheme;
		case "cardset":
			return cardsetScheme;
		case "cost":
			return costScheme;
		case "class":
			return classColorScheme;
	}
	return null;
}

const costScheme: ChartScheme = {
	0: {
		fill: "rgba(204, 204, 255, 0.5)",
		stroke: "rgba(204, 204, 255, 0.9)",
	},
	1: {
		fill: "rgba(153, 153, 255, 0.5)",
		stroke: "rgba(153, 153, 255, 0.9)",
	},
	2: {
		fill: "rgba(102, 102, 255, 0.5)",
		stroke: "rgba(102, 102, 255, 0.9)",
	},
	3: {
		fill: "rgba(51, 51, 255, 0.5)",
		stroke: "rgba(51, 51, 255, 0.9)",
	},
	4: {
		fill: "rgba(0, 0, 255, 0.5)",
		stroke: "rgba(0, 0, 255, 0.9)",
	},
	5: {
		fill: "rgba(0, 0, 204, 0.5)",
		stroke: "rgba(0, 0, 204, 0.9)",
	},
	6: {
		fill: "rgba(0, 0, 153, 0.5)",
		stroke: "rgba(0, 0, 153, 0.9)",
	},
	7: {
		fill: "rgba(0, 0, 102, 0.5)",
		stroke: "rgba(0, 0, 102, 0.9)",
		name: "7+",
	},
};

const rarityScheme: ChartScheme = {
	free: {
		fill: "rgba(211, 211, 211, 0.5)",
		stroke: "rgba(211, 211, 211, 0.9)",
		name: "Free",
	},
	common: {
		fill: "rgba(169, 169, 169, 0.5)",
		stroke: "rgba(169, 169, 169, 0.9)",
		name: "Common",
	},
	rare: {
		fill: "rgba(0, 112, 221, 0.5)",
		stroke: "rgba(0, 112, 221, 0.9)",
		name: "Rare",
	},
	epic: {
		fill: "rgba(163, 53, 238, 0.5)",
		stroke: "rgba(163, 53, 238, 0.9)",
		name: "Epic",
	},
	legendary: {
		fill: "rgba(255, 128, 0, 0.5)",
		stroke: "rgba(255, 128, 0, 0.9)",
		name: "Legendary",
	},
};

const cardtypeScheme: ChartScheme = {
	minion: {
		fill: "rgba(171, 212, 115, 0.5)",
		stroke: "rgba(171, 212, 115, 0.9)",
		name: "Minion",
	},
	spell: {
		fill: "rgba(0, 112, 222, 0.5)",
		stroke: "rgba(0, 112, 222, 0.9)",
		name: "Spell",
	},
	weapon: {
		fill: "rgba(196, 30, 59, 0.5)",
		stroke: "rgba(196, 30, 59, 0.9)",
		name: "Weapon",
	},
};

const cardsetScheme: ChartScheme = {
	"core": {
		fill: "rgba(211, 211, 211, 0.5)",
		stroke: "rgba(211, 211, 211, 0.9)",
		name: "Basic",
	},
	"expert1": {
		fill: "rgba(230, 204, 128, 0.5)",
		stroke: "rgba(230, 204, 128, 0.9)",
		name: "Classic",
	},
	"naxx": {
		fill: "rgba(55, 219, 0, 0.5)",
		stroke: "rgba(55, 219, 0, 0.9)",
		name: "Curse of Naxxramas",
	},
	"gvg": {
		fill: "rgba(255, 212, 0, 0.5)",
		stroke: "rgba(255, 212, 0, 0.9)",
		name: "Goblins vs Gnomes",
	},
	"brm": {
		fill: "rgba(255, 116, 0, 0.5)",
		stroke: "rgba(255, 116, 0, 0.9)",
		name: "Blackrock Mountain",
	},
	"tgt": {
		fill: "rgba(153, 0, 0, 0.5)",
		stroke: "rgba(153, 0, 0, 0.9)",
		name: "The Grand Tournament",
	},
	"loe": {
		fill: "rgba(0, 200, 200, 0.5)",
		stroke: "rgba(0, 200, 200, 0.9)",
		name: "League of Explorers",
	},
	"og": {
		fill: "rgba(170, 0, 255, 0.5)",
		stroke: "rgba(180, 0, 255, 0.9)",
		name: "Whispers of the Old Gods",
	},
	"kara": {
		fill: "rgba(255, 128, 229, 0.5)",
		stroke: "rgba(255, 128, 229, 0.9)",
		name: "One Night in Karazhan",
	},
	"gangs": {
		fill: "rgba(65, 27, 136, 0.5)",
		stroke: "rgba(65, 27, 136, 0.9)",
		name: "Mean Streets of Gadgetzan",
	},
};

const classColorScheme: ChartScheme = {
	all: {
		stroke: "rgba(169, 169, 169, 1)",
		fill: "rgba(169, 169, 169, 0.7)",
		name: "All",
	},
	neutral: {
		stroke: "rgba(169, 169, 169, 1)",
		fill: "rgba(169, 169, 169, 0.7)",
		name: "Neutral",
	},
	druid: {
		stroke: "rgba(255, 125, 10, 1)",
		fill: "rgba(255, 125, 10, 0.7)",
		name: "Druid",
	},
	hunter: {
		stroke: "rgba(171, 212, 114, 1)",
		fill: "rgba(171, 212, 114, 0.7)",
		name: "Hunter",
	},
	mage: {
		stroke: "rgba(105, 204, 240, 1)",
		fill: "rgba(105, 204, 240, 0.7)",
		name: "Mage",
	},
	paladin: {
		stroke: "rgba(245, 140, 186, 1)",
		fill: "rgba(245, 140, 186, 0.7)",
		name: "Paladin",
	},
	priest: {
		stroke: "rgba(210, 210, 210, 1)",
		fill: "rgba(210, 210, 210, 0.7)",
		name: "Priest",
	},
	rogue: {
		stroke: "rgba(255, 217, 26, 1)",
		fill: "rgba(255, 240, 26, 0.7)",
		name: "Rogue",
	},
	shaman: {
		stroke: "rgba(0, 122, 222, 1)",
		fill: "rgba(0, 122, 222, 0.7)",
		name: "Shaman",
	},
	warlock: {
		stroke: "rgba(148, 130, 201, 1)",
		fill: "rgba(148, 130, 201, 0.7)",
		name: "Warlock",
	},
	warrior: {
		stroke: "rgba(199, 156, 110, 1)",
		fill: "rgba(199, 156, 110, 0.7)",
		name: "Warrior",
	},
};

export const setNames = {
	"core": "Basic",
	"expert1": "Classic",
	"reward": "Reward",
	"promo": "Promotion",
	"naxx": "Curse of Naxxramas",
	"gvg": "Goblins vs Gnomes",
	"brm": "Blackrock Mountain",
	"tgt": "The Grand Tournament",
	"tb": "Tavern Brawl",
	"loe": "League of Explorers",
	"og": "Whispers of the Old Gods",
	"kara": "One Night in Karazhan",
	"gangs": "Mean Streets of Gadgetzan",
};

export const wildSets = ["NAXX", "GVG", "PROMO", "REWARD"];

export function isWildCard(card: any) {
	return wildSets.indexOf(card.set) !== -1;
}

export function isCollectibleCard(card: any) {
	return !!card.collectible && ["MINION", "SPELL", "WEAPON"].indexOf(card.type) !== -1;
}

export function getChartMetaData(
	data: DataPoint[],
	midLine?: number,
	seasonTicks?: boolean,
	baseRoundingFactor?: number,
): ChartMetaData {
	const ticks = [];
	const xMin = data[0];
	const xMax = data[data.length - 1];
	const xCenter = +xMin.x + (+xMax.x - +xMin.x) / 2;

	if (seasonTicks) {
		const offset = 12 * 60 * 60 * 1000;
		const minDate = new Date(xMin.x);
		const maxDate = new Date(xMax.x);
		const season = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
		if (season.getTime() >= minDate.getTime()) {
			ticks.push(season.getTime() - offset);
			season.setMonth(season.getMonth() - 1);
			if (season.getTime() >= minDate.getTime()) {
				ticks.push(season.getTime() - offset);
			}
		} else {
			ticks.push(minDate.getTime());
		}
	}

	let yMin = data[0];
	let yMax = data[0];
	data.forEach((d) => {
		if (+d.y < +yMin.y) {
			yMin = d;
		} else if (+d.y > +yMax.y) {
			yMax = d;
		}
	});

	if (!midLine) {
		midLine = (+yMax.y + +yMin.y) / 2;
	}

	const minDelta = Math.abs(midLine - +yMin.y);
	const maxDelta = Math.abs(midLine - +yMax.y);
	const midLinePosition = (maxDelta / (minDelta + maxDelta));

	const top = Math.max(+yMax.y, midLine);
	const bottom = Math.min(+yMin.y, midLine);
	const delta = (+yMax.y - +yMin.y);
	const deltaMag = Math.min(Math.floor(Math.log10(delta)), 0);
	const factor = 10 ** (deltaMag - 1);
	const roundingFactor = 5 * (baseRoundingFactor || 0.1) * factor * 10;
	const domainMax = Math.min(100, (Math.ceil(Math.ceil(top / factor) / roundingFactor) * roundingFactor) * factor);
	const domainMin = Math.max(0, (Math.floor(Math.floor(bottom / factor) / roundingFactor) * roundingFactor) * factor);

	return {
		xDomain: [+xMin.x, +xMax.x],
		xMinMax: [xMin, xMax],
		xCenter,
		yDomain: [domainMin, domainMax],
		yMinMax: [yMin, yMax],
		yCenter: midLine,
		seasonTicks: ticks,
		midLinePosition,
		toFixed: (x) => {
			const fixed = x.toFixed(Math.max(-deltaMag, 0) + 1);
			const split = fixed.split(".");
			const precision = sliceZeros(split[1]);
			return split[0] + (precision.length ? "." + precision : "");
		},
	};
}

export function sliceZeros(input: string): string {
	if (!input) {
		return "";
	}
	let index = -1;
	const chars = input.split("");
	chars.reverse().forEach((char, i) => {
		if (index === -1 && char !== "0") {
			index = i;
		}
	});
	return index === -1 ? "" : chars.slice(index).reverse().join("");
}

export function toPrettyNumber(n: number): string {
	const divisor = 10 ** (Math.floor(Math.log10(n)) - 1);
	n = Math.floor(n / divisor) * divisor;
	return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function toTimeSeries(series: ChartSeries): ChartSeries {
	const timeSeries = {
		data: series.data.map((d) => {
			return {x: new Date(d.x).getTime(), y: d.y};
		}),
		name: series.name,
		metadata: series.metadata,
	};
	timeSeries.data.sort((a, b) => +a.x - +b.x);
	return timeSeries;
}

export function getColorString(
	colors: Colors,
	intensity: number,
	winrate: number,
	mirror?: boolean,
	disable?: boolean,
): string {
	if (mirror) {
		return "black";
	}

	if (winrate === null) {
		return "#ddd";
	}

	let positive = [0, 0, 0];
	let neutral = [0, 100, 100];
	let negative = [0, 0, 0];

	switch (colors) {
		case Colors.REDGREEN:
			positive = [120, 60, 50];
			neutral = [60, 100, 100];
			negative = [0, 100, 65.7];
			break;
		case Colors.REDGREEN2:
			positive = [120, 60, 50];
			neutral = [null, 100, 100];
			negative = [0, 100, 65.7];
			break;
		case Colors.REDGREEN3:
			positive = [120, 70, 40];
			neutral = [90, 100, 15];
			negative = [0, 100, 65.7];
			break;
		case Colors.REDGREEN4:
			positive = [120, 70, 40];
			neutral = [50, 20, 50];
			negative = [0, 100, 65.7];
			break;
		case Colors.ORANGEBLUE:
			positive = [202, 100, 50];
			neutral = [null, 100, 100];
			negative = [41, 100, 50];
			break;
		case Colors.HSREPLAY:
			positive = [214, 66, 34];
			neutral = [null, 100, 100];
			negative = [351, 51, 51];
			break;
	}

	if (disable) {
		positive[1] = 0;
		neutral[1] = 0;
		negative[1] = 0;
	}

	const scale = (x: number, from: number, to: number): number => {
		if (from === null || to === null) {
			return +(to || from);
		}
		x = Math.pow(x, 1 - intensity / 100);
		return from + (to - from) * x;
	};

	const scaleTriple = (x: number, from: Array<number|null>, to: Array<number|null>): number[] => {
		return [
			scale(x, from[0], to[0]),
			scale(x, from[1], to[1]),
			scale(x, from[2], to[2]),
		];
	};

	const hsl = (values: Array<number|null>): string => {
		return "hsl(" + (+values[0]) + ", " + (+values[1]) + "%, " + (+values[2]) + "%)";
	};

	const severity = Math.abs(0.5 - winrate) * 2;

	if (winrate > 0.5) {
		return hsl(scaleTriple(severity, neutral, positive));
	} else if (winrate < 0.5) {
		return hsl(scaleTriple(severity, neutral, negative));
	}

	return hsl(neutral);
}

export function cardSorting(a: any, b: any, direction = 1): number {
	if (a.cardObj !== undefined) {
		a = a.cardObj;
	}
	if (a.card !== undefined) {
		a = a.card;
	}
	if (b.cardObj !== undefined) {
		b = b.cardObj;
	}
	if (b.card !== undefined) {
		b = b.card;
	}
	if (a.cost > b.cost) {
		return direction;
	}
	if (a.cost < b.cost) {
		return -direction;
	}
	if (a.name > b.name) {
		return direction;
	}
	if (a.name < b.name) {
		return -direction;
	}
	return 0;
}

export function cardObjSorting(a: any, b: any, prop: string, direction: number): number {
	const aVal = a[prop] || 0;
	const bVal = b[prop] || 0;
	if (aVal === bVal) {
		return a.card.name > b.card.name ? -direction : direction;
	}
	return (bVal - aVal) * direction;
}

export function getHeroCardId(playerClass: string, skin: boolean) {
	// Heroes sorted by X in their cardId (HERO_0X)
	const sorted = [
		"WARRIOR", "SHAMAN", "ROGUE",
		"PALADIN", "HUNTER", "DRUID",
		"WARLOCK", "MAGE", "PRIEST",
	];

	const hasSkin = [
		"WARRIOR", "SHAMAN", "PALADIN", "HUNTER", "MAGE", "PRIEST",
	];

	let heroId = "" + (sorted.indexOf(playerClass.toUpperCase()) + 1);
	if (skin && hasSkin.indexOf(playerClass.toUpperCase()) !== -1) {
		heroId += "a";
	}

	return "HERO_0" + heroId;
}

export function getDustCost(card: any) {
	// TODO take adventures etc into account
	if (!card || card.set === "CORE") {
		return 0;
	}

	switch (card.rarity) {
		case "COMMON":
			return 40;
		case "RARE":
			return 100;
		case "EPIC":
			return 400;
		case "LEGENDARY":
			return 1600;
	}

	return 0;
}

export function winrateData(baseWinrate: number, winrate: number, deltaFactor: number) {
	const winrateDelta = winrate - baseWinrate;
	const colorWinrate = 50 + Math.max(-50, Math.min(50, (deltaFactor * winrateDelta)));
	const tendencyStr = winrateDelta === 0 ? "    " : (winrateDelta > 0 ? "▲" : "▼");
	const color = getColorString(Colors.REDGREEN3, 75, colorWinrate / 100);
	return {delta: winrateDelta.toFixed(1), color, tendencyStr};
}

export function cleanText(text: string): string {
	return text.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export function slangToCardId(slang: string): string|null {
	switch (slang.toLowerCase()) {
		case "bgh": // Big Game Hunter
			return "EX1_005";
		case "bok": // Blessing of Kings
			return "CS2_092";
		case "bom": // Blessing of Might
			return "CS2_087e";
		case "coh": // Circle of Healing
			return "EX1_621";
		case "dr6": // Mysterious Challenger
			return "AT_079";
		case "dr7": // Dr. Boom
			return "GVG_110";
		case "etc": // Elite Tauren Chieftain
			return "PRO_001";
		case "hex": // Hex
			return "EX1_246";
		case "yogg": // Yogg-Saron, Hope's End
			return "OG_134";
		case "kc": // Kill Command
			return "EX1_539";
		case "mct": // Mind Control Tech
			return "EX1_085";
		case "poly": // Polymorph
			return "CS2_022";
		case "prep": // Preparation
			return "EX1_145";
		case "rag": // Ragnaros the Firelord
			return "EX1_298";
		case "reno": // Reno Jackson
			return "LOE_011";
		case "shredder": // Piloted Shredder
			return "GVG_096";
		case "stb": // Small-Time Buccaneer
			return "CFM_325";
		case "swd": // Shadow: Word Death
			return "EX1_622";
		case "swp": // Shadow: Word Pain
			return "CS2_234";
		case "tbk": // The Black Knight
			return "EX1_002";
		case "477": // Flamewreath Faceless
		case "4mana77":
			return "OG_024";
	}
	return null;
}

export function toDynamicFixed(value: number, fractionDigits: number = 1) {
	const digits = Math.min(Math.max(0, Math.floor(Math.log10(1 / value))), (7 - fractionDigits)) + fractionDigits;
	return value.toFixed(digits);
}

export function cloneComponent(component, props) {
	const componentProps = {...component.props};
	Object.keys(props).forEach((key) => {
		componentProps[key] = props[key];
	});
	return React.cloneElement(component, componentProps);
};

export function getCardUrl(card: any) {
	let slug = card.name.replace(/[^\w\s-]/g, "")
		.trim().toLowerCase()
		.replace(/[-\s]+/g, "-");
	return `/cards/${card.dbfId}/${slug}/`;
}
