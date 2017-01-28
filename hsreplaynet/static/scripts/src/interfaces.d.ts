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
	hero_name: string;
	hero_class_name: string;
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


type RenderTypes = "line_chart" | "bar_chart" | "list" | "class_pie_chart" | "single_value" | "gauge";

export interface RenderData {
	render_as: RenderTypes;
	domain_x?: [number, number];
	domain_y?: [number, number];
	label_x?: string;
	label_y?: string;
	title?: string;
	series: ChartSeries[];
}

export interface ChartSeries {
	data: DataPoint[];
	metadata?: ChartSeriesMetaData;
	name: string;
}

export interface ChartSeriesMetaData {
	is_winrate_data?: boolean;
	num_data_points?: number;
}

export interface DataPoint {
	x: string | number;
	y: number;
}
