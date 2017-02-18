import * as React from "react";
import CardSearch from "../components/CardSearch";
import ClassFilter from "../components/ClassFilter";
import DeckList from "../components/DeckList";
import Pager from "../components/Pager";
import QueryManager from "../QueryManager";
import {DeckObj, TableData} from "../interfaces";
import {cardSorting, toTitleCase} from "../helpers";

type DeckType = "aggro" | "midrange" | "control";
type GameMode = "RANKED_STANDARD" | "RANKED_WILD" | "TAVERNBRAWL";
type RankRange = "ALL" | "LEGEND_ONLY" | "ONE_THROUGH_FIVE" | "SIX_THROUGH_TEN" | "ELEVEN_THROUGH_FIFTEEN" | "SIXTEEN_THROUGH_TWENTY" | "TWENTYONE_THROUGH_TWENTYFIVE" | "LEGEND_THROUGH_TEN" | "ELEVEN_THROUGH_TWENTYFIVE";
type Region = "ALL" | "REGION_US" | "REGION_EU" | "REGION_KR" | "REGION_CN";
type TimeFrame = "LAST_7_DAYS" | "LAST_14_DAYS" | "LAST_30_DAYS" | "CURRENT_SEASON" | "PREVIOUS_SEASON";

type SortProp = "win_rate" | "total_games";

interface DeckDiscoverState {
	cardSearchExcludeKey?: number;
	cardSearchIncludeKey?: number;
	cards?: any[];
	classFilterKey?: string;
	deckData?: Map<string, TableData>;
	deckType?: DeckType;
	excludedCards?: any[];
	gameMode?: GameMode;
	includedCards?: any[];
	rankRange?: RankRange;
	region?: Region;
	selectedClasses?: Map<string, boolean>;
	showFilters?: boolean;
	sortProp?: SortProp;
	timeFrame?: TimeFrame;
}

interface DeckDiscoverProps extends React.ClassAttributes<DeckDiscover> {
	cardData: Map<string, any>;
}

export default class DeckDiscover extends React.Component<DeckDiscoverProps, DeckDiscoverState> {
	private readonly queryManager: QueryManager = new QueryManager();

	constructor(props: DeckDiscoverProps, state: DeckDiscoverState) {
		super(props, state);
		this.state = {
			cardSearchExcludeKey: 0,
			cardSearchIncludeKey: 0,
			cards: null,
			classFilterKey: "ALL",
			deckData: new Map<string, TableData>(),
			deckType: null,
			excludedCards: [],
			gameMode: "RANKED_STANDARD",
			includedCards: [],
			rankRange: "ALL",
			region: "ALL",
			selectedClasses: null,
			showFilters: false,
			sortProp: "win_rate",
			timeFrame: "LAST_30_DAYS",
		}

		this.fetch();
	}

	cacheKey(): string {
		return this.state.gameMode + this.state.rankRange + this.state.region + this.state.timeFrame;
	}
	
	render(): JSX.Element {
		const selectedClass = this.getSelectedClass();
		const decks: DeckObj[] = [];
		const deckData = this.state.deckData.get(this.cacheKey());
		if (!deckData) {
			this.fetch();
		}
		if (this.props.cardData) {
			if (!this.state.cards) {
				const cards = [];
				this.props.cardData.forEach((card, id) => {
					if (card.name && card.collectible && ["MINION", "SPELL", "WEAPON"].indexOf(card.type) !== -1) {
						cards.push(card);
					}
				});
				cards.sort(cardSorting)
				this.state.cards = cards;
			}

			if (deckData && deckData !== "loading" && deckData !== "error") {
				const deckElements = [];
				const data = deckData.series.data;
				Object.keys(data).forEach(key => {
					if (selectedClass === "ALL" || selectedClass === key) {
						data[key].forEach(deck => {
							const cards = JSON.parse(deck["deck_list"]);
							const cardData = cards.map(c => {return {card: this.props.cardData.get(''+c[0]), count: c[1]}});
							if (!this.state.includedCards.length || this.state.includedCards.every(card => cardData.some(cardObj => cardObj.card.id === card.id))) {
								if (!this.state.excludedCards.length || !this.state.excludedCards.some(card => cardData.some(cardObj => cardObj.card.id === card.id))) {
									const costSum = cardData.reduce((a, b) => a + b.card.cost * b.count, 0);
									if (!this.state.deckType || this.state.deckType === "aggro" && costSum < 80
										|| this.state.deckType === "midrange" && costSum >= 80 && costSum < 100
										|| this.state.deckType === "control" && costSum >= 100) {
											deck["cards"] = cardData;
											deck["player_class"] = key;
											deckElements.push(deck);
										}
								}
							}
						});
					}
				});
				deckElements.sort((a, b) => b[this.state.sortProp] - a[this.state.sortProp]);
				deckElements.forEach(deck => {
					decks.push({
						cards: deck.cards,
						deckId: deck.deck_id,
						playerClass: deck.player_class,
						numGames: deck.total_games,
						winrate: deck.win_rate
					});
				});
			}
		}

		let content = null;
		if (!deckData || deckData === "loading" || !this.props.cardData) {
			content = (
				<div className="content-message">
					<h2>Loading...</h2>
				</div>
			);
		}
		else if (deckData === "error") {
			content = (
				<div className="content-message">
					<h2>Something went wrong :(</h2>
					Please try again later.
				</div>
			);
		}
		else if(decks.length === 0) {
			content = (
				<div className="content-message">
					<h2>No decks found</h2>
					<a href="#" onClick={() => this.resetFilters()}>Reset filters</a>
				</div>
			);
		}
		else {
			content = <DeckList decks={decks} pageSize={12} />
		}

		const filterClassNames = ["filter-wrapper"];
		const contentClassNames = ["deck-list-wrapper"]
		if (!this.state.showFilters) {
			filterClassNames.push("hidden-xs");
		}
		else {
			contentClassNames.push("hidden-xs");
		}

		let resetButton = null;
		if (this.state.deckType || this.state.excludedCards.length || this.state.includedCards.length || selectedClass && selectedClass !== "ALL") {
			resetButton = <a href="#" onClick={() => this.resetFilters()}>Reset all filters</a>
		}

		let resetInclude = null;
		if (this.state.includedCards.length) {
			const onClick = () => {
				this.setState({includedCards: [], cardSearchIncludeKey: this.state.cardSearchIncludeKey + 1});
			}
			resetInclude = (
				<a href="#" onClick={onClick} style={{float: "right"}}>clear</a>
			);
		}
		
		let resetExclude = null;
		if (this.state.excludedCards.length) {
			const onClick = () => {
				this.setState({excludedCards: [], cardSearchExcludeKey: this.state.cardSearchExcludeKey + 1});
			}
			resetExclude = (
				<a href="#" onClick={onClick} style={{float: "right"}}>clear</a>
			);
		}

		return (
			<div className="deck-discover">
				<div className={filterClassNames.join(" ")}>
					<span className="visible-xs">
						<button
							className="btn btn-primary"
							type="button"
							onClick={() => this.setState({showFilters: false})}
						>
							Back
						</button>
					</span>
					<div className="filters">
						<div className="pull-right">
							{resetButton}
						</div>
						<h4>Class</h4>
						<ClassFilter 
							hideAll
							key={this.state.classFilterKey}
							multiSelect={false}
							filters="All"
							minimal
							selectionChanged={(selected) => this.setState({selectedClasses: selected})}
						/>
						{resetInclude}
						<h4>Include cards</h4>
						<CardSearch
							key={"cardinclude" + this.state.cardSearchIncludeKey}
							availableCards={this.state.cards}
							onCardsChanged={(cards) => this.setState({includedCards: cards})}
						/>
						{resetExclude}
						<h4>Exclude cards</h4>
						<CardSearch
							key={"cardexclude" + this.state.cardSearchExcludeKey}
							availableCards={this.state.cards}
							onCardsChanged={(cards) => this.setState({excludedCards: cards})}
						/>
						<h4>Deck type</h4>
						<ul>
							{this.buildFilter("deckType", "aggro", "Aggro", null)}
							{this.buildFilter("deckType", "midrange", "Midrange", null)}
							{this.buildFilter("deckType", "control", "Control", null)}
						</ul>
						<h4>Mode</h4>
						<ul>
							{this.buildFilter("gameMode", "RANKED_STANDARD", "Standard")}
							{this.buildFilter("gameMode", "RANKED_WILD", "Wild")}
							{this.buildFilter("gameMode", "TAVERNBRAWL", "Brawl")}
						</ul>
						<h4>Time frame</h4>
						<ul>
							{this.buildFilter("timeFrame", "LAST_7_DAYS", "Last 7 days")}
							{this.buildFilter("timeFrame", "LAST_14_DAYS", "Last 14 days")}
							{this.buildFilter("timeFrame", "LAST_30_DAYS", "Last 30 days")}
							{this.buildFilter("timeFrame", "CURRENT_SEASON", "Current season")}
							{this.buildFilter("timeFrame", "PREVIOUS_SEASON", "Previous season")}
						</ul>
						<h4>Rank range</h4>
						<ul>
							{this.buildFilter("rankRange", "LEGEND_ONLY", "Legend only", "ALL")}
							{this.buildFilter("rankRange", "ONE_THROUGH_FIVE", "1 - 5", "ALL")}
							{this.buildFilter("rankRange", "SIX_THROUGH_TEN", "6 - 10", "ALL")}
							{this.buildFilter("rankRange", "ELEVEN_THROUGH_FIFTEEN", "11 - 15", "ALL")}
							{this.buildFilter("rankRange", "SIXTEEN_THROUGH_TWENTY", "16 - 20", "ALL")}
							{this.buildFilter("rankRange", "TWENTYONE_THROUGH_TWENTYFIVE", "21 - 25", "ALL")}
							{this.buildFilter("rankRange", "LEGEND_THROUGH_TEN", "Legend - 10", "ALL")}
							{this.buildFilter("rankRange", "ELEVEN_THROUGH_TWENTYFIVE", "11 - 25", "ALL")}
						</ul>
						<h4>Region</h4>
						<ul>
							{this.buildFilter("region", "REGION_US", "Americas", "ALL")}
							{this.buildFilter("region", "REGION_EU", "Europe", "ALL")}
							{this.buildFilter("region", "REGION_KR", "Asia", "ALL")}
							{this.buildFilter("region", "REGION_CN", "China", "ALL")}
						</ul>
						<h4>Sort by</h4>
						<ul>
							{this.buildFilter("sortProp", "win_rate", "Winrate")}
							{this.buildFilter("sortProp", "total_games", "Popularity")}
						</ul>
					</div>
				</div>
				<div className={contentClassNames.join(" ")}>
					{content}
				</div>
			</div>
		);
	}

	buildFilter(prop: string, key: string, displayValue: string, defaultValue?: string): JSX.Element {
		const selected = this.state[prop] === key;
		const onClick = () => {
			if (!selected || defaultValue !== undefined) {
				const newState = {};
				newState[prop] = selected ? defaultValue : key;
				this.setState(newState);
			}
		}
		
		const classNames = [];
		if (selected) {
			classNames.push("selected");
			if (!defaultValue) {
				classNames.push("no-deselect");
			}
		}

		return (
			<li onClick={onClick} className={classNames.join(" ")}>
				{displayValue}
			</li>
		);

	}

	getSelectedClass(): string {
		if (!this.state.selectedClasses) {
			return undefined;
		}
		let selectedClass = "ALL";
		this.state.selectedClasses.forEach((value, key) => {
			if(value) {
				selectedClass = key;
			}
		});
		return selectedClass;
	}

	resetFilters() {
		this.setState({
			cardSearchExcludeKey: this.state.cardSearchExcludeKey + 1,
			cardSearchIncludeKey: this.state.cardSearchIncludeKey + 1,
			classFilterKey: this.state.classFilterKey + 1,
			deckType: null,
			excludedCards: [],
			includedCards: [],
			selectedClasses: null
		});
	}

	fetch() {
		this.queryManager.fetch(
			"/analytics/query/list_decks_by_win_rate?TimeRange=" + this.state.timeFrame + "&RankRange=" + this.state.rankRange + "&GameType=" + this.state.gameMode + "&Region=" + this.state.region,
			(data) => this.setState({deckData: this.state.deckData.set(this.cacheKey(), data)})
		);
	}

}
