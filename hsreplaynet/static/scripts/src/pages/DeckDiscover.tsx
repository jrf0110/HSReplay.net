import * as React from "react";
import CardData from "../CardData";
import CardSearch from "../components/CardSearch";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import DeckList from "../components/DeckList";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import NoDecksMessage from "../components/NoDecksMessage";
import PremiumWrapper from "../components/PremiumWrapper";
import ResetHeader from "../components/ResetHeader";
import DataManager from "../DataManager";
import { cardSorting, getDustCost, wildSets } from "../helpers";
import { DeckObj } from "../interfaces";
import {
	getQueryMapArray, getQueryMapDiff, getQueryMapFromLocation, QueryMap,
	queryMapHasChanges, setLocationQueryString, setQueryMap,
} from "../QueryParser";
import InfoboxLastUpdated from "../components/InfoboxLastUpdated";
import UserData from "../UserData";

interface DeckDiscoverState {
	cardSearchExcludeKey?: number;
	cardSearchIncludeKey?: number;
	cards?: any[];
	filteredDecks: DeckObj[];
	loading?: boolean;
	queryMap?: QueryMap;
	showFilters?: boolean;
}

interface DeckDiscoverProps extends React.ClassAttributes<DeckDiscover> {
	cardData: CardData;
	user: UserData;
}

export default class DeckDiscover extends React.Component<DeckDiscoverProps, DeckDiscoverState> {
	private readonly dataManager: DataManager = new DataManager();
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
			filteredDecks: [],
			loading: true,
			queryMap: getQueryMapFromLocation(this.defaultQueryMap, this.getAllowedValues()),
			showFilters: false,
		};
		this.updateFilteredDecks();
	}

	getAllowedValues(): any {
		return this.props.user.isPremium() ? this.allowedValuesPremium : this.allowedValues;
	}

	componentDidUpdate(prevProps: DeckDiscoverProps, prevState: DeckDiscoverState) {
		setLocationQueryString(this.state.queryMap, this.defaultQueryMap);
		if (this.state.queryMap !== prevState.queryMap || this.props.cardData !== prevProps.cardData) {
			this.updateFilteredDecks();
		}
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

	getDeckElements(): Promise<any[]> {
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
		if (this.state.queryMap.personal && this.props.user.hasFeature("profiles")) {
			if (!this.dataManager.has("/decks/mine")) {
				this.setState({loading: true});
			}
			return this.dataManager.get("/decks/mine/").then(((myDecks: any[]) => {
				Object.keys(myDecks).forEach((deckId) => {
					const deck = Object.assign({}, myDecks[deckId]);
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
				return deckElements;
			}));
		}
		else {
			const params = this.getParams();
			const query = this.getQueryName();
			if (!this.dataManager.has(query, params)) {
				this.setState({loading: true});
			}
			return this.dataManager.get(query, params).then((deckData) => {
				const newParams = this.getParams();
				if (Object.keys(params).some((key) => params[key] !== newParams[key])) {
					return Promise.reject("Params changed");
				}

				const data = deckData.series.data;
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
				return deckElements;
			});
		}
	}

	updateFilteredDecks(): void {
		if (!this.props.cardData) {
			return;
		}
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
		this.getDeckElements().then(((deckElements) => {
			const decks: DeckObj[] = [];
			const direction = this.state.queryMap.sortDirection === "descending" ? 1 : -1;
			deckElements.sort((a, b) => {
				const x = +a[sortProp];
				const y = +b[sortProp];
				if(x !== y) {
					return (b[sortProp] - a[sortProp]) * direction;
				}
				return a["deck_id"].localeCompare(b["deck_id"]) * direction;
			});
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
			this.setState({filteredDecks: decks, loading: false});
		})).catch((reason) => {
			if (reason !== "Params changed" && reason !== 202) {
				console.error(reason);
			}
		});
	}

	render(): JSX.Element {
		const queryMap = this.state.queryMap;

		let content = null;
		if (this.state.loading) {
			content = <h3 className="message-wrapper">Loading…</h3>;
		}
		else if (this.state.filteredDecks.length === 0) {
			if (this.state.queryMap["personal"] && this.props.user.hasFeature("profiles")) {
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
					decks={this.state.filteredDecks}
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
					sortDirection={this.state.queryMap["sortDirection"] as "ascending"|"descending"}
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

		let personalFilters = null;
		if (this.props.user.hasFeature("profiles")) {
			let loginLink = null;
			if (!this.props.user.isAuthenticated()) {
				loginLink = <a className="infobox-value" href="/account/login/?next=/decks/">Log in</a>;
			}
			personalFilters = [
				<h2>Personal</h2>,
				<InfoboxFilterGroup
					deselectable
					selectedValue={this.state.queryMap["personal"]}
					onClick={(value) => setQueryMap(this, "personal", value)}
				>
					<InfoboxFilter value="true" disabled={!this.props.user.isAuthenticated()}>
						I have played (last 30 days)
						{loginLink}
					</InfoboxFilter>
				</InfoboxFilterGroup>,
			];
		}

		const selectedCards = (key: string) => {
			if (!this.props.cardData || !queryMap[key]) {
				return undefined;
			}
			return queryMap[key].split(",").map((dbfId) => this.props.cardData.fromDbf(dbfId));
		};

		let filteredCards = Array.isArray(this.state.cards) ? this.state.cards : [];
		const gameType = this.state.queryMap.gameType;
		if (gameType.endsWith("_STANDARD")) {
			filteredCards = filteredCards.filter((card) => {
				return wildSets.indexOf(card.set) === -1;
			});
		}
		const playerClass = this.state.queryMap.playerClass;
		if (playerClass !== "ALL") {
			filteredCards = filteredCards.filter((card) => {
				const cardClass = card.cardClass;
				return cardClass === "NEUTRAL" || cardClass === playerClass;
			});
		}

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
					<section id="player-class-filter">
						<h2>Player Class</h2>
						<ClassFilter
							filters="All"
							hideAll
							minimal
							multiSelect={false}
							selectedClasses={[queryMap["playerClass"] as FilterOption]}
							selectionChanged={(selected) => setQueryMap(this, "playerClass", selected[0])}
						/>
					</section>
					<section id="opponent-class-filter">
						<PremiumWrapper
							isPremium={this.props.user.isPremium()}
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
								selectionChanged={(selected) => this.props.user.isPremium() && setQueryMap(this, "opponentClass", selected[0])}
							/>
						</PremiumWrapper>
					</section>
					<section id="include-cards-filter">
						<h2>Included Cards</h2>
						<CardSearch
							id="card-search-include"
							key={"cardinclude" + this.state.cardSearchIncludeKey}
							availableCards={filteredCards}
							onCardsChanged={(cards) => setQueryMap(this, "includedCards", cards.map((card) => card.dbfId).join(","))}
							selectedCards={selectedCards("includedCards")}
						/>
					</section>
					<section id="exclude-cards-filter">
						<h2>Excluded Cards</h2>
						<CardSearch
							id="card-search-exclude"
							key={"cardexclude" + this.state.cardSearchExcludeKey}
							availableCards={filteredCards}
							onCardsChanged={(cards) => setQueryMap(this, "excludedCards", cards.map((card) => card.dbfId).join(","))}
							selectedCards={selectedCards("excludedCards")}
						/>
					</section>
					{personalFilters}
					<section id="game-mode-filter">
						<h2>Game Mode</h2>
						<InfoboxFilterGroup
							selectedValue={this.state.queryMap["gameType"]}
							onClick={(value) => setQueryMap(this, "gameType", value)}
						>
							<InfoboxFilter value="RANKED_STANDARD">Ranked Standard</InfoboxFilter>
							<InfoboxFilter value="RANKED_WILD">Ranked Wild</InfoboxFilter>
						</InfoboxFilterGroup>
					</section>
					<section id="time-frame-filter">
						<PremiumWrapper
							isPremium={this.props.user.isPremium()}
							infoHeader="Time Frame"
							infoContent="Want to see which decks are hot right now? Look at data from a time frame of your choosing!"
						>
							<h2>Time frame</h2>
							<InfoboxFilterGroup
								locked={!this.props.user.isPremium()}
								selectedValue={this.state.queryMap["timeRange"]}
								onClick={(value) => setQueryMap(this, "timeRange", value)}
							>
								<InfoboxFilter value="CURRENT_SEASON">Current Season</InfoboxFilter>
								<InfoboxFilter value="LAST_3_DAYS">Last 3 days</InfoboxFilter>
								<InfoboxFilter value="LAST_7_DAYS">Last 7 days</InfoboxFilter>
								<InfoboxFilter value="LAST_30_DAYS">Last 30 days</InfoboxFilter>
							</InfoboxFilterGroup>
						</PremiumWrapper>
					</section>
					<section id="rank-range-filter">
						<PremiumWrapper
							isPremium={this.props.user.isPremium()}
							infoHeader="Rank Range"
							infoContent="Ready to climb the ladder? Check out how decks perform at certain rank ranges!"
						>
							<h2>Rank range</h2>
							<InfoboxFilterGroup
								locked={!this.props.user.isPremium()}
								selectedValue={this.state.queryMap["rankRange"]}
								onClick={(value) => setQueryMap(this, "rankRange", value)}
							>
								<InfoboxFilter value="LEGEND_THROUGH_TEN">Legend–10</InfoboxFilter>
								<InfoboxFilter value="ALL">Legend–25</InfoboxFilter>
							</InfoboxFilterGroup>
						</PremiumWrapper>
					</section>
					<section id="side-bar-data">
						<h2>Data</h2>
						<ul>
							<InfoboxLastUpdated dataManager={this.dataManager} url={this.getQueryName()} params={this.getParams()}/>
						</ul>
					</section>
					{backButton}
				</div>
				<div className={contentClassNames.join(" ")}>
					<span className="pull-left col-xs-12 col-sm-12 col-md-6 col-lg-8" id="min-games-message">
						Decks require at least 1000 recorded games in the selected time frame to be listed.
					</span>
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

	getQueryName(): string {
		return this.props.user.isPremium() ? "list_decks_by_opponent_win_rate" : "list_decks_by_win_rate";
	}

	getParams(): any {
		return {
			GameType: this.state.queryMap["gameType"] || this.defaultQueryMap["gameType"],
			RankRange: this.state.queryMap["rankRange"] || this.defaultQueryMap["rankRange"],
			TimeRange: this.state.queryMap["timeRange"] || this.defaultQueryMap["timeRange"],
			// Region: this.state.queryMap["region"],
		};
	}
}
