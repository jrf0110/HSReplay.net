import {SortDirection} from "../../interfaces";

export type CardTableColumnKey = (
	"damageDone"
	| "distinctDecks"
	| "drawnWinrate"
	| "healingDone"
	| "heroesKilled"
	| "keepPercent"
	| "minionsKilled"
	| "mulliganWinrate"
	| "playedWinrate"
	| "timesPlayed"
	| "turnPlayed"
	| "turnsInHand"
	| "totalGames"
	| "winrate"
);

export interface CardTableColumn {
	dataKey: string;
	defaultSortDirection?: SortDirection;
	infoHeader?: string;
	infoText?: string;
	percent?: boolean;
	sortKey?: string;
	text: string;
	winrateData?: boolean;
}

export const cardTableColumnData: {[key in CardTableColumnKey]: CardTableColumn} = {
	mulliganWinrate: {
		dataKey: "opening_hand_win_rate",
		infoHeader: "Mulligan winrate",
		infoText: "Average winrate of games when the card ended up in the opening hand.",
		sortKey: "mulliganWinrate",
		text: "Mulligan WR",
		winrateData: true,
	},
	keepPercent: {
		dataKey: "keep_percentage",
		infoHeader: "Kept",
		infoText: "Percentage of times the card was kept when presented during mulligan.",
		percent: true,
		sortKey: "keepPercent",
		text: "Kept",
	},
	drawnWinrate: {
		dataKey: "win_rate_when_drawn",
		infoHeader: "Drawn winrate",
		infoText: "Average winrate of games where the card was drawn at any point or ended up in the opening hand.",
		sortKey: "drawnWinrate",
		text: "Drawn WR",
		winrateData: true,
	},
	playedWinrate: {
		dataKey: "win_rate_when_played",
		infoHeader: "Played winrate",
		infoText: "Average winrate of games where the card was played at any point.",
		sortKey: "playedWinrate",
		text: "Played WR",
		winrateData: true,
	},
	turnsInHand: {
		dataKey: "avg_turns_in_hand",
		infoHeader: "Turns held",
		infoText: "Average number of turns the card was held in hand.",
		sortKey: "turnsInHand",
		text: "Turns held",
	},
	turnPlayed: {
		dataKey: "avg_turn_played_on",
		infoHeader: "Turn played",
		infoText: "Average turn the card was played on.",
		sortKey: "turnPlayed",
		text: "Turn played",
	},
	timesPlayed: {
		dataKey: "times_played",
		infoHeader: "Times played",
		infoText: "Number of times you played the card.",
		sortKey: "timesPlayed",
		text: "Times played",
	},
	damageDone: {
		dataKey: "damage_done",
		infoHeader: "Damage done",
		infoText: "Total amount of damage the card has dealt. Does not include overkills.",
		sortKey: "damageDone",
		text: "Damage done",
	},
	healingDone: {
		dataKey: "healing_done",
		infoHeader: "Healing done",
		infoText: "Total amount of healing the card has done. Does not include overhealing.",
		sortKey: "healingDone",
		text: "Healing done",
	},
	heroesKilled: {
		dataKey: "heroes_killed",
		infoHeader: "Heroes killed",
		infoText: "Number of heroes the card has killed.",
		sortKey: "heroesKilled",
		text: "Heroes killed",
	},
	minionsKilled: {
		dataKey: "minions_killed",
		infoHeader: "Minions killed",
		infoText: "Number of minions the card has killed.",
		sortKey: "minionsKilled",
		text: "Minions killed",
	},
	totalGames: {
		dataKey: "total_games",
		infoHeader: "Total games",
		infoText: "Number of games you played with a deck that included the card.",
		sortKey: "totalGames",
		text: "Total games",
	},
	winrate: {
		dataKey: "win_rate",
		infoHeader: "Winrate",
		infoText: "Winrate of decks including the card.",
		sortKey: "winrate",
		text: "Winrate",
		winrateData: true,
	},
	distinctDecks: {
		dataKey: "distinct_decks",
		infoHeader: "Distinct decks",
		infoText: "Number of distinct decks you included the card in.",
		sortKey: "distinctDecks",
		text: "Distinct decks",
	},
};
