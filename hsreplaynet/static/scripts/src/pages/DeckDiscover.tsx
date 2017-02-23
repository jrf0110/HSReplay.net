import * as React from "react";
import CardSearch from "../components/CardSearch";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import DeckList from "../components/DeckList";
import Pager from "../components/Pager";
import PremiumWrapper from "../components/PremiumWrapper";
import QueryManager from "../QueryManager";
import ResetHeader from "../components/ResetHeader";
import {DeckObj, TableData, GameMode, RankRange, Region, TimeFrame} from "../interfaces";
import {cardSorting, toTitleCase} from "../helpers";
import {
	QueryMap, getQueryMapArray, getQueryMapFromLocation, queryMapHasChanges,
	setLocationQueryString, setQueryMap, toQueryString
} from "../QueryParser"

interface DeckDiscoverState {
	cardSearchExcludeKey?: number;
	cardSearchIncludeKey?: number;
	cards?: any[];
	deckData?: Map<string, TableData>;
	myDecks?: number[];
	queryMap?: QueryMap;
	showFilters?: boolean;
}

interface DeckDiscoverProps extends React.ClassAttributes<DeckDiscover> {
	cardData: Map<string, any>;
	userIsAuthenticated: boolean;
}

export default class DeckDiscover extends React.Component<DeckDiscoverProps, DeckDiscoverState> {
	private readonly queryManager: QueryManager = new QueryManager();
	private readonly defaultQueryMap: QueryMap = {
		deckType: "",
		excludedCards: "",
		gameType: "RANKED_STANDARD",
		includedCards: "",
		opponentClass: "ALL",
		personal: "",
		playerClass: "ALL",
		rankRange: "ALL",
		region: "ALL",
		sortBy: "popularity",
		timeRange: "LAST_30_DAYS",
	}
	private readonly allowedValues = {
		gameType: ["RANKED_STANDARD", "RANKED_WILD"],
		rankRange: ["LEGEND_ONLY", "LEGEND_THROUGH_TEN"],
		region: [],
		timeRange: ["CURRENT_SEASON", "LAST_3_DAYS", "LAST_7_DAYS", "LAST_30_DAYS"],
	}

	constructor(props: DeckDiscoverProps, state: DeckDiscoverState) {
		super(props, state);
		this.state = {
			cardSearchExcludeKey: 0,
			cardSearchIncludeKey: 0,
			cards: null,
			deckData: new Map<string, TableData>(),
			myDecks: [],
			queryMap: getQueryMapFromLocation(this.defaultQueryMap, this.allowedValues),
			showFilters: false,
		}
		this.fetch();
	}

	cacheKey(state?: DeckDiscoverState): string {
		const queryMap = (state || this.state).queryMap;
		const cacheKey = [];
		Object.keys(this.allowedValues).forEach(key => {
			const value = this.allowedValues[key];
			if (value.length) {
				cacheKey.push(queryMap[key]);
			}
		});
		return cacheKey.join("");
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
		setLocationQueryString(this.state.queryMap, this.defaultQueryMap);
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

	getDeckType(totalCost: number): string {
		return totalCost >= 100 ? "control" : (totalCost >= 80 ? "midrange" : "aggro");
	}

	render(): JSX.Element {
		const queryMap = Object.assign({}, this.state.queryMap);
		
		const selectedClass = queryMap["playerClass"];
		const selectedOpponent = queryMap["opponentClass"];
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
							const deckList = cards.map(c => {return {card: this.props.cardData.get(''+c[0]), count: c[1]}});
							const includedCards = getQueryMapArray(queryMap, "includedCards").map(id => this.props.cardData.get(id));
							if (!includedCards.length || includedCards.every(card => deckList.some(cardObj => cardObj.card.id === card.id))) {
								const excludedCards = getQueryMapArray(queryMap, "excludedCards").map(id => this.props.cardData.get(id));
								if (!excludedCards.length || !excludedCards.some(card => deckList.some(cardObj => cardObj.card.id === card.id))) {
									const costSum = deckList.reduce((a, b) => a + b.card.cost * b.count, 0);
									const deckType = queryMap["deckType"];
									if (!deckType || deckType === this.getDeckType(costSum)) {
										if ((!queryMap["personal"] && this.state.myDecks.length) || !this.state.myDecks.length || this.state.myDecks.indexOf(+deck["deck_id"]) !== -1) {
											deck["cards"] = deckList;
											deck["player_class"] = key;
											deckElements.push(deck);
										}
									}
								}
							}
						});
					}
				});

				const winrateField = selectedOpponent === "ALL" ? "overall_win_rate" : "win_rate_vs_" + selectedOpponent;
				const numGamesField = selectedOpponent === "ALL" ? "total_games" : "total_games_vs_" + selectedOpponent;
				const sortProp = queryMap["sortBy"] === "winrate" ? winrateField : numGamesField;

				deckElements.sort((a, b) => b[sortProp] - a[sortProp]);

				deckElements.forEach(deck => {
					decks.push({
						cards: deck.cards,
						deckId: deck.deck_id,
						playerClass: deck.player_class,
						numGames: deck[numGamesField],
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
					<a href="#" onClick={() => this.setState({queryMap: this.defaultQueryMap})}>Reset filters</a>
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

		const backButton = (
			<button className="btn btn-primary btn-full visible-sm visible-xs" type="button" onClick={() => this.setState({showFilters: false})}>
				Back to card list
			</button>
		);

		let loginLink = null;
		const personalClassNames = ["selectable"];
		if (!this.props.userIsAuthenticated) {
			personalClassNames.push("disabled");
			loginLink = <a className="infobox-value" href="/account/login/?next=/decks/">Log in</a>;
		}
		else if (!this.state.myDecks.length) {
			personalClassNames.push("disabled")
		}
		else if (queryMap["personal"]) {
			personalClassNames.push("selected");
		}

		return (
			<div className="deck-discover">
				<div className={filterClassNames.join(" ")} id="deck-discover-infobox">
					{backButton}
					<ResetHeader onReset={() => this.setState({queryMap: this.defaultQueryMap})} showReset={queryMapHasChanges(this.state.queryMap, this.defaultQueryMap)}>
						Deck Database
					</ResetHeader>
					<h2>Class</h2>
						<ClassFilter 
							filters="All"
							hideAll
							minimal
							multiSelect={false}
							selectedClasses={[queryMap["playerClass"] as FilterOption]}
							selectionChanged={(selected) => setQueryMap(this, "playerClass", selected[0])}
						/>
					<PremiumWrapper isPremium={!this.mockFree()}>
						<h2>Winrate vs</h2>
						<ClassFilter 
							filters="All"
							hideAll
							minimal
							multiSelect={false}
							selectedClasses={[queryMap["opponentClass"] as FilterOption]}
							selectionChanged={(selected) => !this.mockFree() && setQueryMap(this, "opponentClass", selected[0])}
						/>
					</PremiumWrapper>
					<h2>Include cards</h2>
					<CardSearch
						key={"cardinclude" + this.state.cardSearchIncludeKey}
						availableCards={this.state.cards}
						onCardsChanged={(cards) => setQueryMap(this, "includedCards", cards.map(card => card.dbfId).join(","))}
						selectedCards={this.props.cardData && queryMap["includedCards"] && queryMap["includedCards"].split(",").map(id => this.props.cardData.get(id))}
					/>
					<h2>Exclude cards</h2>
					<CardSearch
						key={"cardexclude" + this.state.cardSearchExcludeKey}
						availableCards={this.state.cards}
						onCardsChanged={(cards) => setQueryMap(this, "excludedCards", cards.map(card => card.dbfId).join(","))}
						selectedCards={this.props.cardData && queryMap["excludedCards"] && queryMap["excludedCards"].split(",").map(id => this.props.cardData.get(id))}
					/>
					<h2>Personal</h2>
					<ul>
						<li className={personalClassNames.join(" ")} onClick={() => personalClassNames.indexOf("disabled") === -1 && setQueryMap(this, "personal", queryMap["personal"] ? null : "true")}>
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
						{this.buildFilter("gameType", "RANKED_STANDARD", "Standard")}
						{this.buildFilter("gameType", "RANKED_WILD", "Wild")}
					</ul>
					<PremiumWrapper isPremium={!this.mockFree()}>
						<h2>Time frame</h2>
						<ul>
							{this.buildFilter("timeRange", "CURRENT_SEASON", "Current season", undefined, this.mockFree())}
							{this.buildFilter("timeRange", "LAST_3_DAYS", "Last 3 days", undefined, this.mockFree())}
							{this.buildFilter("timeRange", "LAST_7_DAYS", "Last 7 days", undefined, this.mockFree())}
							{this.buildFilter("timeRange", "LAST_30_DAYS", "Last 30 days", undefined, this.mockFree())}
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
						{this.buildFilter("sortBy", "popularity", "Popularity")}
						{this.buildFilter("sortBy", "winrate", "Winrate")}
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
		const selected = this.state.queryMap[prop] === key;
		const onClick = () => {
			if (!locked && (!selected || defaultValue !== undefined)) {
				setQueryMap(this, prop, selected? defaultValue : key);
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

	fetch() {
		const params = {
			TimeRange: this.state.queryMap["timeRange"],
			RankRange: this.state.queryMap["rangeRange"],
			GameType: this.state.queryMap["gameType"],
			// Region: this.state.queryMap["region"],
		};

		//TODO: use "list_decks_by_win_rate" for non-premium
		this.queryManager.fetch(
			"/analytics/query/list_decks_by_opponent_win_rate?" + toQueryString(params),
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
