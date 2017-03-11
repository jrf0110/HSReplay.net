import * as React from "react";
import CardData from "../CardData";
import CardSearch from "../components/CardSearch";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import DeckList from "../components/DeckList";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import NoDecksMessage from "../components/NoDecksMessage";
import Pager from "../components/Pager";
import PremiumWrapper from "../components/PremiumWrapper";
import ResetHeader from "../components/ResetHeader";
import { cardSorting, getDustCost, isReady, toTitleCase } from "../helpers";
import { DeckObj, GameMode, MyDecks, RankRange, Region, TableData, TableQueryData, TimeFrame } from "../interfaces";
import QueryManager from "../QueryManager";
import {
	genCacheKey, getQueryMapArray, getQueryMapDiff, getQueryMapFromLocation, QueryMap,
	queryMapHasChanges, setLocationQueryString, setQueryMap, toQueryString,
} from "../QueryParser";

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
	};

	private readonly allowedValues = {
		gameType: ["RANKED_STANDARD", "RANKED_WILD"],
		opponentClass: [],
		rankRange: [],
		region: [],
		timeRange: ["LAST_30_DAYS"],
	};

	private readonly allowedValuesPremium = {
		gameType: ["RANKED_STANDARD", "RANKED_WILD"],
		rankRange: ["LEGEND_THROUGH_TEN"],
		region: [],
		timeRange: ["CURRENT_SEASON", "LAST_3_DAYS", "LAST_7_DAYS", "LAST_30_DAYS"],
	};

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
		};
		this.fetch();
	}

	getAllowedValues(): any {
		return this.props.userIsPremium ? this.allowedValuesPremium : this.allowedValues;
	}

	componentDidUpdate(prevProps: DeckDiscoverProps, prevState: DeckDiscoverState) {
		const cacheKey = genCacheKey(this);
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
			cards.sort(cardSorting);
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

	getDeckElements(): any[] {
		if (this.state.queryMap.personal && !this.state.myDecks) {
			return [];
		}
		const deckElements = [];
		const playerClass = this.state.queryMap.playerClass;
		const filteredCards = (key: string): any[] => {
			return getQueryMapArray(this.state.queryMap, key)
				.map((dbfId) => this.props.cardData.fromDbf(dbfId));
		};
		const includedCards = filteredCards("includedCards");
		const excludedCards = filteredCards("excludedCards");
		const missingIncludedCards = (deckList: any[]) => {
			return includedCards.some((card) => deckList.every((cardObj) => cardObj.card.id !== card.id));
		};
		const containsExcludedCards = (deckList: any[]) => {
			return excludedCards.some((card) => deckList.some((cardObj) => cardObj.card.id === card.id));
		};
		const manaCost = (deckList: any[]) => deckList.reduce((a, b) => a + b.card.cost * b.count, 0);
		const dustCost = (deckList: any[]) => deckList.reduce((a, b) => a + getDustCost(b.card) * b.count, 0);
		const cardList = (cards) => cards.map((c: any[]) => {
			return {card: this.props.cardData.fromDbf(c[0]), count: c[1]};
		});
		const pushDeck = (deck: any, cards: any[]) => {
			deck.cards = cards;
			deck.dust_cost = dustCost(cards);
			deck.mana_cost = manaCost(cards);
			deckElements.push(deck);
		};
		if (this.state.queryMap.personal) {
			Object.keys(this.state.myDecks).forEach((deckId) => {
				const deck = Object.assign({}, this.state.myDecks[deckId]);
				if (playerClass !== "ALL" && playerClass !== deck.player_class) {
					return;
				}
				const gameTypes = Object.keys(deck.game_types);
				if (gameTypes.indexOf("BGT_ARENA") !== -1) {
					return;
				}
				if (gameTypes.indexOf("BGT_" + this.state.queryMap.gameType) === -1) {
					return;
				}
				const cards = cardList(deck.deck_list);
				if (missingIncludedCards(cards) || containsExcludedCards(cards)) {
					return;
				}
				deck.win_rate *= 100;
				pushDeck(deck, cards);
			});
		}
		else {
			const data = (this.state.deckData.get(genCacheKey(this)) as TableQueryData).series.data;
			Object.keys(data).forEach((key) => {
				if (playerClass !== "ALL" && playerClass !== key) {
					return;
				}
				data[key].forEach((deck) => {
					const cards = cardList(JSON.parse(deck.deck_list));
					if (missingIncludedCards(cards) || containsExcludedCards(cards)) {
						return;
					}
					deck.player_class = key;
					pushDeck(deck, cards);
				});
			});
		}
		return deckElements;
	}

	getFilteredDecks(): DeckObj[] {
		if (!this.props.cardData) {
			return [];
		}
		const decks: DeckObj[] = [];
		const selectedOpponent = this.state.queryMap.opponentClass;
		const winrateField = selectedOpponent === "ALL" ? "win_rate" : "win_rate_vs_" + selectedOpponent;
		const numGamesField = selectedOpponent === "ALL" ? "total_games" : "total_games_vs_" + selectedOpponent;
		let sortProp = this.state.queryMap.sortBy;
		switch (sortProp) {
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
		const deckElements = this.getDeckElements();
		const direction = this.state.queryMap.sortDirection === "descending" ? 1 : -1;
		deckElements.sort((a, b) => (b[sortProp] - a[sortProp]) * direction);
		deckElements.forEach((deck) => {
			decks.push({
				cards: deck.cards,
				deckId: deck.deck_id,
				duration: deck.avg_game_length_seconds,
				numGames: deck[numGamesField],
				playerClass: deck.player_class,
				winrate: deck[winrateField],
			});
		});
		return decks;
	}

	render(): JSX.Element {
		const queryMap = this.state.queryMap;
		const deckData = this.state.deckData.get(genCacheKey(this));
		const decks = isReady(deckData) ? this.getFilteredDecks() : [];

		let content = null;
		if (!deckData || deckData === "loading" || !this.props.cardData || queryMap.personal && !this.state.myDecks) {
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
		else if (decks.length === 0) {
			if (this.state.queryMap["personal"]) {
				content = (
					<NoDecksMessage>
						<button
							className="btn btn-default"
							type="button"
							onClick={() => setQueryMap(this, "personal", null)}
						>
							Back to the decks
						</button>
					</NoDecksMessage>
				);
			}
			else {
				content = (
					<div className="content-message">
						<h2>No decks found</h2>
						<button className="btn btn-default" type="button" onClick={() => this.resetFilters()}>
							Reset filters
						</button>
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
							setQueryMap(
								this, "sortDirection", this.state.queryMap["sortDirection"] === "ascending" ? "descending" : "ascending",
							);
						}
						else {
							const newQueryMap = Object.assign({}, this.state.queryMap);
							newQueryMap["sortDirection"] = "descending";
							newQueryMap["sortBy"] = name;
							this.setState({queryMap: newQueryMap});
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
		const contentClassNames = ["deck-list-wrapper"];
		if (!this.state.showFilters) {
			filterClassNames.push("hidden-xs hidden-sm");
		}
		else {
			contentClassNames.push("hidden-xs hidden-sm");
		}

		const backButton = (
			<button
				className="btn btn-primary btn-full visible-sm visible-xs"
				type="button"
				onClick={() => this.setState({showFilters: false})}
			>
				Back to deck list
			</button>
		);

		const personalDisabled = !this.props.userIsAuthenticated || !this.state.myDecks || this.state.myDecks === "error";

		let loginLink = null;
		if (!this.props.userIsAuthenticated) {
			loginLink = <a className="infobox-value" href="/account/login/?next=/decks/">Log in</a>;
		}

		const selectedCards = (key: string) => {
			if (!this.props.cardData || !queryMap[key]) {
				return undefined;
			}
			return queryMap[key].split(",").map((dbfId) => this.props.cardData.fromDbf(dbfId));
		};

		return (
			<div className="deck-discover">
				<div className={filterClassNames.join(" ")} id="deck-discover-infobox">
					{backButton}
					<ResetHeader
						onReset={() => this.resetFilters()}
						showReset={queryMapHasChanges(this.state.queryMap, this.getDefeaultQueryMap())}
					>
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
						onCardsChanged={(cards) => setQueryMap(this, "includedCards", cards.map((card) => card.dbfId).join(","))}
						selectedCards={selectedCards("includedCards")}
					/>
					<h2>Exclude cards</h2>
					<CardSearch
						key={"cardexclude" + this.state.cardSearchExcludeKey}
						availableCards={this.state.cards}
						onCardsChanged={(cards) => setQueryMap(this, "excludedCards", cards.map((card) => card.dbfId).join(","))}
						selectedCards={selectedCards("excludedCards")}
					/>
					<h2>Personal</h2>
					<InfoboxFilterGroup
						deselectable
						selectedValue={this.state.queryMap["personal"]}
						onClick={(value) => setQueryMap(this, "personal", value)}
					>
						<InfoboxFilter value="true" disabled={personalDisabled}>
							I have played (last 30 days)
							{loginLink}
						</InfoboxFilter>
					</InfoboxFilterGroup>
					<h2>Mode</h2>
					<InfoboxFilterGroup
						selectedValue={this.state.queryMap["gameType"]}
						onClick={(value) => setQueryMap(this, "gameType", value)}
					>
						<InfoboxFilter value="RANKED_STANDARD">Standard</InfoboxFilter>
						<InfoboxFilter value="RANKED_WILD">Wild</InfoboxFilter>
					</InfoboxFilterGroup>
					<PremiumWrapper
						isPremium={this.props.userIsPremium}
						infoHeader="Time frame"
						infoContent="Want to see what decks are hot right now? Look at data from a time frame of your choosing!"
					>
						<h2>Time frame</h2>
						<InfoboxFilterGroup
							locked={!this.props.userIsPremium}
							selectedValue={this.state.queryMap["timeRange"]}
							onClick={(value) => setQueryMap(this, "timeRange", value)}
						>
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
						<InfoboxFilterGroup
							locked={!this.props.userIsPremium}
							selectedValue={this.state.queryMap["rankRange"]}
							onClick={(value) => setQueryMap(this, "rankRange", value)}
						>
							<InfoboxFilter value="LEGEND_THROUGH_TEN">Legend–10</InfoboxFilter>
							<InfoboxFilter value="ALL">Legend–25</InfoboxFilter>
						</InfoboxFilterGroup>
					</PremiumWrapper>
					{backButton}
				</div>
				<div className={contentClassNames.join(" ")}>
					<div className="alert alert-info" role="alert">
						Decks require at least 1000 recorded games in the selected time frame to be listed.
					</div>
					<button
						className="btn btn-default pull-left visible-xs visible-sm"
						type="button"
						onClick={() => this.setState({showFilters: true})}
					>
						<span className="glyphicon glyphicon-filter" />
						Filters
					</button>
					{content}
				</div>
			</div>
		);
	}

	fetch() {
		const params = {
			GameType: this.state.queryMap["gameType"] || this.defaultQueryMap["gameType"],
			RankRange: this.state.queryMap["rankRange"] || this.defaultQueryMap["rankRange"],
			TimeRange: this.state.queryMap["timeRange"] || this.defaultQueryMap["timeRange"],
			// Region: this.state.queryMap["region"],
		};

		const cacheKey = genCacheKey(this);

		const query = this.props.userIsPremium ? "list_decks_by_opponent_win_rate" : "list_decks_by_win_rate";
		this.queryManager.fetch(
			"/analytics/query/" + query + "?" + toQueryString(params),
			(data) => this.setState({deckData: this.state.deckData.set(cacheKey, data)}),
		);

		if (!this.state.myDecks) {
			this.queryManager.fetch("/decks/mine/", (data) => this.setState({myDecks: data}));
		}
	}
}
