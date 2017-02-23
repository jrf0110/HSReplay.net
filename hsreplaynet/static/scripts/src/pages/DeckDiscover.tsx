import * as React from "react";
import CardSearch from "../components/CardSearch";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import DeckList from "../components/DeckList";
import Pager from "../components/Pager";
import PremiumWrapper from "../components/PremiumWrapper";
import QueryManager from "../QueryManager";
import {DeckObj, TableData, GameMode, RankRange, Region, TimeFrame} from "../interfaces";
import {cardSorting, toTitleCase} from "../helpers";

type DeckType = "aggro" | "midrange" | "control";
type SortProp = "win_rate" | "total_games";

interface DeckDiscoverState {
	cardSearchExcludeKey?: number;
	cardSearchIncludeKey?: number;
	cards?: any[];
	deckData?: Map<string, TableData>;
	deckType?: DeckType;
	excludedCards?: any[];
	gameMode?: GameMode;
	includedCards?: any[];
	rankRange?: RankRange;
	region?: Region;
	selectedClasses?: FilterOption[];
	selectedOpponentClasses?: FilterOption[];
	showFilters?: boolean;
	sortProp?: SortProp;
	timeFrame?: TimeFrame;
	myDecks?: number[];
	personal?: boolean;
}

interface DeckDiscoverProps extends React.ClassAttributes<DeckDiscover> {
	cardData: Map<string, any>;
	userIsAuthenticated: boolean;
}

export default class DeckDiscover extends React.Component<DeckDiscoverProps, DeckDiscoverState> {
	private readonly queryManager: QueryManager = new QueryManager();

	constructor(props: DeckDiscoverProps, state: DeckDiscoverState) {
		super(props, state);
		this.state = {
			cardSearchExcludeKey: 0,
			cardSearchIncludeKey: 0,
			cards: null,
			deckData: new Map<string, TableData>(),
			deckType: null,
			excludedCards: [],
			gameMode: "RANKED_STANDARD",
			includedCards: [],
			rankRange: "ALL",
			region: "ALL",
			selectedClasses: ["ALL"],
			selectedOpponentClasses: ["ALL"],
			showFilters: false,
			sortProp: "total_games",
			timeFrame: "LAST_30_DAYS",
			myDecks: [],
			personal: false,
		}

		this.fetch();
	}

	cacheKey(state?: DeckDiscoverState): string {
		state = state || this.state;
		return state.gameMode + state.rankRange + state.region + state.timeFrame;
	}

	componentDidUpdate(prevProps: DeckDiscoverProps, prevState: DeckDiscoverState) {
		const cacheKey = this.cacheKey();
		const prevCacheKey = this.cacheKey(prevState);
		if (cacheKey !== prevCacheKey) {
			const deckData = this.state.deckData.get(cacheKey);
			if (!deckData || deckData === "error") {
				this.fetch();
			}
		}
	}

	componentWillReceiveProps(nextProps: DeckDiscoverProps) {
		if (!this.state.cards && nextProps.cardData) {
			const cards = [];
			nextProps.cardData.forEach((card, id) => {
				if (card.name && card.collectible && ["MINION", "SPELL", "WEAPON"].indexOf(card.type) !== -1) {
					cards.push(card);
				}
			});
			cards.sort(cardSorting)
			this.setState({cards});
		}
	}

	render(): JSX.Element {
		const selectedClass = this.state.selectedClasses[0];
		const decks: DeckObj[] = [];
		const deckData = this.state.deckData.get(this.cacheKey());
		if (this.props.cardData) {
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
											if (!this.state.personal || !this.state.myDecks || this.state.myDecks.indexOf(+deck["deck_id"]) !== -1) {
												deck["cards"] = cardData;
												deck["player_class"] = key;
												deckElements.push(deck);
											}
										}
								}
							}
						});
					}
				});

				const selectedOpponent = this.state.selectedOpponentClasses[0];
				const winrateField = selectedOpponent === "ALL" ? "overall_win_rate" : "win_rate_vs_" + selectedOpponent;
				const sortProp = this.state.sortProp === "win_rate" ? winrateField : this.state.sortProp;

				deckElements.sort((a, b) => b[sortProp] - a[sortProp]);

				deckElements.forEach(deck => {
					decks.push({
						cards: deck.cards,
						deckId: deck.deck_id,
						playerClass: deck.player_class,
						numGames: deck.total_games,
						winrate: deck[winrateField],
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
					<h2>Counting cards...</h2>
					Please check back later.
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
			content = <DeckList decks={decks} pageSize={12} />;
		}

		const filterClassNames = ["infobox full-sm"];
		const contentClassNames = ["deck-list-wrapper"]
		if (!this.state.showFilters) {
			filterClassNames.push("hidden-xs hidden-sm");
		}
		else {
			contentClassNames.push("hidden-xs hidden-sm");
		}

		let resetButton = null;
		if (this.state.deckType || this.state.excludedCards.length || this.state.includedCards.length || selectedClass && selectedClass !== "ALL") {
			resetButton = <button className="btn btn-danger btn-full" onClick={() => this.resetFilters()}>Reset all filters</button>
		}

		const backButton = (
			<button className="btn btn-primary btn-full visible-sm visible-xs" type="button" onClick={() => this.setState({showFilters: false})}>
				Back to card list
			</button>
		);

		let loginLink = null;
		const personalClassNames = ["selectable"];
		if (this.state.personal) {
			personalClassNames.push("selected");
		}
		if (!this.props.userIsAuthenticated) {
			personalClassNames.push("disabled");
			loginLink = <a className="infobox-value" href="/account/login/?next=/decks/">Log in</a>;
		}
		else if (!this.state.myDecks.length) {
			personalClassNames.push("disabled")
		}

		return (
			<div className="deck-discover">
				<div className={filterClassNames.join(" ")} id="deck-discover-infobox">
					<h1>Deck Database</h1>
					{backButton}
					{resetButton}
					<h2>Class</h2>
						<ClassFilter 
							filters="All"
							hideAll
							minimal
							multiSelect={false}
							selectedClasses={this.state.selectedClasses}
							selectionChanged={(selected) => this.setState({selectedClasses: selected})}
						/>
					<PremiumWrapper isPremium={!this.mockFree()}>
						<h2>Winrate vs</h2>
						<ClassFilter 
							filters="All"
							hideAll
							minimal
							multiSelect={false}
							selectedClasses={this.state.selectedOpponentClasses}
							selectionChanged={(selected) => !this.mockFree() && this.setState({selectedOpponentClasses: selected})}
						/>
					</PremiumWrapper>
					<h2>Include cards</h2>
					<CardSearch
						key={"cardinclude" + this.state.cardSearchIncludeKey}
						availableCards={this.state.cards}
						onCardsChanged={(cards) => this.setState({includedCards: cards})}
					/>
					<h2>Exclude cards</h2>
					<CardSearch
						key={"cardexclude" + this.state.cardSearchExcludeKey}
						availableCards={this.state.cards}
						onCardsChanged={(cards) => this.setState({excludedCards: cards})}
					/>
					<h2>Personal</h2>
					<ul>
						<li className={personalClassNames.join(" ")} onClick={() => personalClassNames.indexOf("disabled") === -1 && this.setState({personal: !this.state.personal})}>
							My deck only
							{loginLink}
						</li>
					</ul>
					<h2>Deck type</h2>
					<ul>
						{this.buildFilter("deckType", "aggro", "Aggro", null)}
						{this.buildFilter("deckType", "midrange", "Midrange", null)}
						{this.buildFilter("deckType", "control", "Control", null)}
					</ul>
					<h2>Mode</h2>
					<ul>
						{this.buildFilter("gameMode", "RANKED_STANDARD", "Standard")}
						{this.buildFilter("gameMode", "RANKED_WILD", "Wild")}
					</ul>
					<PremiumWrapper isPremium={!this.mockFree()}>
						<h2>Time frame</h2>
						<ul>
							{this.buildFilter("timeFrame", "CURRENT_SEASON", "Current season", undefined, this.mockFree())}
							{this.buildFilter("timeFrame", "LAST_3_DAYS", "Last 3 days", undefined, this.mockFree())}
							{this.buildFilter("timeFrame", "LAST_7_DAYS", "Last 7 days", undefined, this.mockFree())}
							{this.buildFilter("timeFrame", "LAST_30_DAYS", "Last 30 days", undefined, this.mockFree())}
						</ul>
					</PremiumWrapper>
					<PremiumWrapper isPremium={!this.mockFree()}>
						<h2>Rank range</h2>
						<ul>
							{this.buildFilter("rankRange", "LEGEND_ONLY", "Legend only", "ALL", this.mockFree())}
							{this.buildFilter("rankRange", "LEGEND_THROUGH_TEN", "Legend - 10", "ALL", this.mockFree())}
						</ul>
					</PremiumWrapper>
					<h2>Sort by</h2>
					<ul>
						{this.buildFilter("sortProp", "total_games", "Popularity")}
						{this.buildFilter("sortProp", "win_rate", "Winrate")}
					</ul>
					{backButton}
				</div>
				<div className={contentClassNames.join(" ")}>
					<button
						className="btn btn-default pull-left visible-xs visible-sm"
						type="button"
						onClick={() => this.setState({showFilters: true})}
					>
						<span className="glyphicon glyphicon-filter"/>
						Filters
					</button>
					{content}
				</div>
			</div>
		);
	}

	buildFilter(prop: string, key: string, displayValue: string, defaultValue?: string, locked?: boolean): JSX.Element {
		const selected = this.state[prop] === key;
		const onClick = () => {
			if (!locked && (!selected || defaultValue !== undefined)) {
				const newState = {};
				newState[prop] = selected ? defaultValue : key;
				this.setState(newState);
			}
		}
		
		const classNames = ["selectable"];
		if (selected) {
			classNames.push("selected");
			if (defaultValue === undefined) {
				classNames.push("no-deselect");
			}
		}

		return (
			<li onClick={onClick} className={classNames.join(" ")}>
				{displayValue}
			</li>
		);

	}

	resetFilters() {
		this.setState({
			cardSearchExcludeKey: this.state.cardSearchExcludeKey + 1,
			cardSearchIncludeKey: this.state.cardSearchIncludeKey + 1,
			deckType: null,
			excludedCards: [],
			includedCards: [],
			selectedClasses: ["ALL"]
		});
	}

	fetch() {
		//TODO: use "list_decks_by_win_rate" for non-premium
		this.queryManager.fetch(
			"/analytics/query/list_decks_by_opponent_win_rate?TimeRange=" + this.state.timeFrame + "&RankRange=" + this.state.rankRange + "&GameType=" + this.state.gameMode + "&Region=" + this.state.region,
			(data) => this.setState({deckData: this.state.deckData.set(this.cacheKey(), data)})
		);
		
		this.queryManager.fetch("/decks/mine/", (data) => this.setState({myDecks: data.my_decks}));
	}
	
	getQueryParams(): string[] {
		const params = window.location.href.split("?")[1];
		if (params) {
			return params.split("&");
		}
		return [];
	}

	mockFree(): boolean {
		return this.getQueryParams().indexOf("free") !== -1;
	}

}
