import {PlayState} from "./hearthstone";


export interface User {
	id: number;
	username: string;
}

export interface GameReplay {
	shortid: string;
	user: User;
	global_game: GlobalGame;
	friendly_player?: GlobalGamePlayer;
	friendly_deck?: Deck;
	opposing_player?: GlobalGamePlayer;
	opposing_deck?: Deck|null;
	spectator_mode: boolean;
	friendly_player_id: number;
	replay_xml: string;
	build: number;
	won: boolean;
	disconnected: boolean;
	reconnecting: boolean;
	visibility: number;
}

export interface GlobalGame {
	build: number;
	match_start: string;
	match_end: string;
	game_type: number;
	format: number;
	ladder_season: number;
	scenario_id: number;
	num_turns: number;
}

export interface GlobalGamePlayer {
	name:string;
	player_id: number;
	account_hi: number;
	account_lo: number;
	is_ai: boolean;
	is_first: boolean;
	hero_id: string;
	hero_premium: boolean;
	final_state: PlayState;
	wins: number;
	losses: number;
	rank: number;
	legend_rank: number;
}

export interface Deck {
	digest: string;
	size: any;
	cards: string[];
}

export const enum Visibility {
	Public = 1,
	Unlisted = 2,
	Private = 3,
}

export interface ImageProps {
	image: (string) => string;
}

export interface CardArtProps {
	cardArt: (string) => string;
}

export interface ReplayFilter {
	name: string;
	default: string;
	options: [string, string][];
}

export interface SelectableProps {
	select?: string;
	onSelect?: (key: string) => void;
}
