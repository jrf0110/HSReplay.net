import * as React from "react";
import CardData from "../CardData";
import CardSearch from "../components/CardSearch";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import DeckList from "../components/DeckList";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import Pager from "../components/Pager";
import PremiumWrapper from "../components/PremiumWrapper";
import QueryManager from "../QueryManager";
import ResetHeader from "../components/ResetHeader";
import {DeckObj, TableData, GameMode, MyDecks, RankRange, Region, TimeFrame} from "../interfaces";
import {cardSorting, getDustCost, toTitleCase} from "../helpers";
import {
	genCacheKey, QueryMap, getQueryMapArray, getQueryMapFromLocation, queryMapHasChanges,
	setLocationQueryString, setQueryMap, toQueryString, getQueryMapDiff
} from "../QueryParser"

interface DeckDiscoverState {
	cardSearchExcludeKey?: number;
	cardSearchIncludeKey?: number;
	cards?: any[];
	deckData?: Map<string, TableData>;
	myDecks?: MyDecks;
	queryMap?: QueryMap;
	showFilters?: boolean;
}

interface DeckDiscoverProps extends React.ClassAttributes<DeckDiscover> {
	cardData: CardData;
	userIsAuthenticated: boolean;
	userIsPremium: boolean;
}

export default class DeckDiscover extends React.Component<DeckDiscoverProps, DeckDiscoverState> {
	private readonly queryManager: QueryManager = new QueryManager();
	private readonly defaultQueryMap: QueryMap = {
		excludedCards: "",
		gameType: "RANKED_STANDARD",
		includedCards: "",
		opponentClass: "ALL",
		personal: "",
		playerClass: "ALL",
		rankRange: "ALL",
		region: "ALL",
		sortBy: "popularity",
		sortDirection: "descending",
		timeRange: "LAST_30_DAYS",
	}

	private readonly allowedValues = {
		gameType: ["RANKED_STANDARD", "RANKED_WILD"],
		rankRange: [],
		region: [],
		opponentClass: [],
		timeRange: ["LAST_30_DAYS"],
	}

	private readonly allowedValuesPremium = {
		gameType: ["RANKED_STANDARD", "RANKED_WILD"],
		rankRange: ["LEGEND_THROUGH_TEN"],
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
			myDecks: null,
			queryMap: getQueryMapFromLocation(this.defaultQueryMap, this.getAllowedValues()),
			showFilters: false,
		}
		this.fetch();
	}

	getAllowedValues(): any {
		return this.props.userIsPremium ? this.allowedValuesPremium : this.allowedValues;
	}

	componentDidUpdate(prevProps: DeckDiscoverProps, prevState: DeckDiscoverState) {
		const cacheKey = genCacheKey(this)
		const prevCacheKey = genCacheKey(this, prevState);
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
			nextProps.cardData.all().forEach((card) => {
				if (card.name && card.collectible && ["MINION", "SPELL", "WEAPON"].indexOf(card.type) !== -1) {
					cards.push(card);
				}
			});
			cards.sort(cardSorting)
			this.setState({cards});
		}
	}

	getDefeaultQueryMap(): QueryMap {
		const queryMap = Object.assign({}, this.defaultQueryMap);
		queryMap.sortBy = this.state.queryMap.sortBy;
		queryMap.sortDirection = this.state.queryMap.sortDirection;
		return queryMap;
	}

	resetFilters(): void {
		this.setState({queryMap: this.getDefeaultQueryMap()});
	}

	getDeckType(totalCost: number): string {
		return totalCost >= 100 ? "control" : (totalCost >= 80 ? "midrange" : "aggro");
	}

	render(): JSX.Element {
		const queryMap = Object.assign({}, this.state.queryMap);
		
		const selectedClass = queryMap["playerClass"];
		const selectedOpponent = queryMap["opponentClass"];
		const decks: DeckObj[] = [];
		const deckData = this.state.deckData.get(genCacheKey(this));
		if (this.props.cardData) {
			if (deckData && deckData !== "loading" && deckData !== "error") {
				const deckElements = [];
				const data = deckData.series.data;
				const includedCards = getQueryMapArray(queryMap, "includedCards").map(dbfId => this.props.cardData.fromDbf(dbfId));
				const excludedCards = getQueryMapArray(queryMap, "excludedCards").map(dbfId => this.props.cardData.fromDbf(dbfId));
				Object.keys(data).forEach(key => {
					if (selectedClass === "ALL" || selectedClass === key) {
						data[key].forEach(deck => {
							const cards = JSON.parse(deck["deck_list"]);
							const deckList = cards.map(c => {return {card: this.props.cardData.fromDbf(c[0]), count: c[1]}});
							if (!includedCards.length || includedCards.every(card => deckList.some(cardObj => cardObj.card.id === card.id))) {
								if (!excludedCards.length || !excludedCards.some(card => deckList.some(cardObj => cardObj.card.id === card.id))) {
									const costSum = deckList.reduce((a, b) => a + b.card.cost * b.count, 0);
									if (!queryMap["personal"] || this.state.myDecks && this.state.myDecks[deck["deck_id"]]) {
										deck["cards"] = deckList;
										deck["dust_cost"] = deckList.reduce((a, b) => a + getDustCost(b.card) * b.count, 0);
										deck["mana_cost"] = costSum;
										deck["player_class"] = key;
										deckElements.push(deck);
									}
								}
							}
						});
					}
				});

				const winrateField = selectedOpponent === "ALL" ? "win_rate" : "win_rate_vs_" + selectedOpponent;
				const numGamesField = selectedOpponent === "ALL" ? "total_games" : "total_games_vs_" + selectedOpponent;
				let sortProp = queryMap["sortBy"];
				switch(sortProp) {
					case "winrate": 
						sortProp = winrateField;
						break;
					case "popularity":
						sortProp = numGamesField;
						break;
					case "duration":
						sortProp = "avg_game_length_seconds";
						break;
				}

				const direction = queryMap["sortDirection"] === "descending" ? 1 : -1;
				deckElements.sort((a, b) => (b[sortProp] - a[sortProp]) * direction);

				deckElements.forEach(deck => {
					decks.push({
						cards: deck.cards,
						deckId: deck.deck_id,
						duration: deck.avg_game_length_seconds,
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
			if (this.state.queryMap["personal"]) {
				content = (
					<div className="content-message">
						<h2>None of your decks are here :(</h2><br/>
						<h3>We can fix that!</h3>
						<p>Step 1: If you haven't already, <a href="/downloads/">download Hearthstone Deck Tracker</a></p>
						<p>Step 2: Play some games with a deck from the list and it will show up!</p><br/>
						<p><i>Protip: Every deck has a "Copy deck to HDT" button!</i></p><br/>
						<button className="btn btn-default" type="button" onClick={() => setQueryMap(this, "personal", null)}>Back to the decks</button>
					</div>
				);
			}
			else {
				content = (
					<div className="content-message">
						<h2>No decks found</h2>
						<button className="btn btn-default" type="button" onClick={() => this.resetFilters()}>Reset filters</button>
					</div>
				);
			}
		}
		else {
			content = (
				<DeckList
					decks={decks}
					onHeaderClicked={(name: string) => {
						if (this.state.queryMap["sortBy"] === name) {
							setQueryMap(this, "sortDirection", this.state.queryMap["sortDirection"] === "ascending" ? "descending" : "ascending");
						}
						else {
							const queryMap = Object.assign({}, this.state.queryMap);
							queryMap["sortDirection"] = "descending";
							queryMap["sortBy"] = name;
							this.setState({queryMap});
						}
					}}
					pageSize={12}
					sortCol={this.state.queryMap["sortBy"]}
					sortDirection={this.state.queryMap["sortDirection"]}
					urlGameType={getQueryMapDiff(this.state.queryMap, this.defaultQueryMap).gameType}
				/>
			);
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
				Back to deck list
			</button>
		);

		const personalDisabled = !this.props.userIsAuthenticated || !this.state.myDecks || this.state.myDecks === "error";

		let loginLink = null;
		if (!this.props.userIsAuthenticated) {
			loginLink = <a className="infobox-value" href="/account/login/?next=/decks/">Log in</a>;
		}

		return (
			<div className="deck-discover">
				<div className={filterClassNames.join(" ")} id="deck-discover-infobox">
					{backButton}
					<ResetHeader onReset={() => this.resetFilters()} showReset={queryMapHasChanges(this.state.queryMap, this.getDefeaultQueryMap())}>
						Decks
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
					<PremiumWrapper
						isPremium={this.props.userIsPremium}
						infoHeader="Winrate by opponent"
						infoContent="See at a glance how various decks perform against a specific class!"
					>
						<h2>Opponent class</h2>
						<ClassFilter 
							filters="All"
							hideAll
							minimal
							multiSelect={false}
							selectedClasses={[queryMap["opponentClass"] as FilterOption]}
							selectionChanged={(selected) => this.props.userIsPremium && setQueryMap(this, "opponentClass", selected[0])}
						/>
					</PremiumWrapper>
					<h2>Include cards</h2>
					<CardSearch
						key={"cardinclude" + this.state.cardSearchIncludeKey}
						availableCards={this.state.cards}
						onCardsChanged={(cards) => setQueryMap(this, "includedCards", cards.map(card => card.dbfId).join(","))}
						selectedCards={this.props.cardData && queryMap["includedCards"] && queryMap["includedCards"].split(",").map(dbfId => this.props.cardData.fromDbf(dbfId))}
					/>
					<h2>Exclude cards</h2>
					<CardSearch
						key={"cardexclude" + this.state.cardSearchExcludeKey}
						availableCards={this.state.cards}
						onCardsChanged={(cards) => setQueryMap(this, "excludedCards", cards.map(card => card.dbfId).join(","))}
						selectedCards={this.props.cardData && queryMap["excludedCards"] && queryMap["excludedCards"].split(",").map(dbfId => this.props.cardData.fromDbf(dbfId))}
					/>
					<h2>Personal</h2>
					<InfoboxFilterGroup deselectable selectedValue={this.state.queryMap["personal"]} onClick={(value) => setQueryMap(this, "personal", value)}>
						<InfoboxFilter value="true" disabled={personalDisabled}>
							I have played (last 30 days)
							{loginLink}
						</InfoboxFilter>
					</InfoboxFilterGroup>
					<h2>Mode</h2>
					<InfoboxFilterGroup selectedValue={this.state.queryMap["gameType"]} onClick={(value) => setQueryMap(this, "gameType", value)}>
						<InfoboxFilter value="RANKED_STANDARD">Standard</InfoboxFilter>
						<InfoboxFilter value="RANKED_WILD">Wild</InfoboxFilter>
					</InfoboxFilterGroup>
					<PremiumWrapper
						isPremium={this.props.userIsPremium}
						infoHeader="Time frame"
						infoContent="Want to see what decks are hot right now? Look at data from a time frame of your choosing!"
					>
						<h2>Time frame</h2>
						<InfoboxFilterGroup locked={!this.props.userIsPremium} selectedValue={this.state.queryMap["timeRange"]} onClick={(value) => setQueryMap(this, "timeRange", value)}>
							<InfoboxFilter value="CURRENT_SEASON">Current Season</InfoboxFilter>
							<InfoboxFilter value="LAST_3_DAYS">Last 3 days</InfoboxFilter>
							<InfoboxFilter value="LAST_7_DAYS">Last 7 days</InfoboxFilter>
							<InfoboxFilter value="LAST_30_DAYS">Last 30 days</InfoboxFilter>
						</InfoboxFilterGroup>
					</PremiumWrapper>
					<PremiumWrapper
						isPremium={this.props.userIsPremium}
						infoHeader="Rank range"
						infoContent="Ready to climb the ladder? Check out how decks perform in the higher ranks!"
					>
						<h2>Rank range</h2>
						<InfoboxFilterGroup locked={!this.props.userIsPremium} selectedValue={this.state.queryMap["rankRange"]} onClick={(value) => setQueryMap(this, "rankRange", value)}>
							<InfoboxFilter value="LEGEND_THROUGH_TEN">Legend–10</InfoboxFilter>
							<InfoboxFilter value="ALL">Legend–25</InfoboxFilter>
						</InfoboxFilterGroup>
					</PremiumWrapper>
					{backButton}
				</div>
				<div className={contentClassNames.join(" ")}>
					<div className="alert alert-info" role="alert">Decks require at least 1000 recorded games in the selected time frame to be listed</div>
					<div className="opponent-filter-wrapper">
					</div>
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

	fetch() {
		const params = {
			TimeRange: this.state.queryMap["timeRange"] || this.defaultQueryMap["timeRange"],
			RankRange: this.state.queryMap["rankRange"] || this.defaultQueryMap["rankRange"],
			GameType: this.state.queryMap["gameType"] || this.defaultQueryMap["gameType"],
			// Region: this.state.queryMap["region"],
		};

		const cacheKey = genCacheKey(this);

		const query = this.props.userIsPremium ? "list_decks_by_opponent_win_rate" : "list_decks_by_win_rate";
		this.queryManager.fetch(
			"/analytics/query/" + query + "?" + toQueryString(params),
			(data) => this.setState({deckData: this.state.deckData.set(cacheKey, data)})
		);

		if (!this.state.myDecks) {
			this.queryManager.fetch("/decks/mine/", (data) => this.setState({myDecks: data}));
		}
	}
}
