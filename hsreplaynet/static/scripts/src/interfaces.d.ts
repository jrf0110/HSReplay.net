import {PlayState} from "./hearthstone";
import {TooltipContent} from "./components/Tooltip";

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
	hero_dbf_id: number;
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

export interface SelectableProps {
	select?: string;
	onSelect?: (key: string) => void;
}

type RenderTypes = "chart" | "table" | "line_chart" | "bar_chart" | "list" | "class_pie_chart" | "single_value" | "gauge" | "list_table";

export interface FilterData {
	filters: Filter[];
	server_date: Date;
}

export interface Filter {
	name: string;
	elements: FilterElement[];
}

export interface FilterElement {
	index: number;
	is_default: boolean;
	is_implemented: boolean;
	is_premium: boolean;
	name: string;
}

export interface FilterDefinition {
	name: string;
	elementNames: Map<string, string>;
	visible: string[];
}

export interface KeyValuePair {
	key: string;
	value: string;
}

export interface Query {
	endpoint: string;
	params: string[];
	avg_query_duration_seconds?: number;
}

export interface TableData {
	title?: string;
	series: TableSeries;
}

export interface TableSeries {
	metadata?: TableSeriesMetaData;
	data: TableSeriesData;
}

export interface TableSeriesMetaData {
	[obj: string]: number | TableRow[];
}

export interface TableSeriesData {
	[table: string]: TableRow[];
}

export interface TableRow {
	[header: string]: any;
}

export interface RenderData {
	render_as?: RenderTypes;
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
	[metaData: string]: any;
}

export interface DataPoint {
	[key: string] : string | number;
}

export type ChartSchemeType = "rarity" | "cardtype" | "cardset" | "cost" | "class";

export interface ChartScheme {
	[key: string]: ChartSchemeData;
}

export interface ChartSchemeData {
	fill: string;
	stroke: string;
	name?: string;
}

export interface ChartMetaData {
	xDomain: [number, number];
	xMinMax: [DataPoint, DataPoint];
	xCenter: number;
	yDomain: [number, number];
	yMinMax: [DataPoint, DataPoint];
	yCenter: number;
	seasonTicks: number[];
	midLinePosition: number;
	toFixed: (value: number) => string;
}

export interface DeckObj {
	cards: CardObj[];
	deckId: string;
	playerClass: string;
	numGames: number;
	winrate: number;
	duration: number;
	noGlobalData?: boolean;
	archetypeId?: number;
}

export interface CardObj {
	card: any;
	count: number;
}

export interface MyDecks {
	[deckId: string]: any;
}

export interface ArchetypeData {
	matchups: MatchupData[];
	id: number;
	name: string;
	playerClass: string
	popularityTotal: number;
	popularityClass: number;
	winrate: number;
	effectiveWinrate: number;
}

export interface MatchupData {
	friendlyId: number;
	friendlyName: string;
	friendlyPlayerClass: string;
	opponentId: number;
	opponentName: string;
	opponentPlayerClass: string;
	winrate: number;
	totalGames: number;
}

export interface ApiArchetype {
	id: number;
	name: string;
	player_class: string;
}

export interface ApiArchetypeMatchupData {
	friendly_archetype_id: number;
	opponent_archetype_id: number;
	win_rate: number;
	total_games: number;
}

export interface ApiArchetypePopularity {
	archetype_id: number;
	total_games: number;
	win_rate: number;
	pct_of_class: number;
	pct_of_total: number;
}

export type GameMode = "RANKED_STANDARD" | "RANKED_WILD" | "TAVERNBRAWL";
export type RankRange = "ALL" | "LEGEND_ONLY" | "ONE_THROUGH_FIVE" | "SIX_THROUGH_TEN" | "ELEVEN_THROUGH_FIFTEEN" | "SIXTEEN_THROUGH_TWENTY" | "TWENTYONE_THROUGH_TWENTYFIVE" | "LEGEND_THROUGH_TEN" | "ELEVEN_THROUGH_TWENTYFIVE";
export type Region = "ALL" | "REGION_US" | "REGION_EU" | "REGION_KR" | "REGION_CN";
export type TimeFrame = "LAST_7_DAYS" | "LAST_14_DAYS" | "LAST_30_DAYS" | "CURRENT_SEASON" | "PREVIOUS_SEASON";

export const enum LoadingStatus {
	SUCCESS,
	LOADING,
	PROCESSING,
	NO_DATA,
	ERROR,
}

export interface FragmentChildProps {
	canBeReset?: boolean;
	reset?: () => void;
}

export type SortDirection = "ascending" | "descending";

export interface TableHeaderProps {
	sortKey: string;
	text: string;
	defaultSortDirection?: SortDirection;
	infoHeader?: string;
	infoText?: TooltipContent;
	sortable?: boolean;
	classNames?: string[];
}
