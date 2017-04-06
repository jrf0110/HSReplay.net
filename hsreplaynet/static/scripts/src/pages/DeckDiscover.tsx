import * as React from "react";
import * as _ from "lodash";
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
import {cardSorting, getDustCost, isWildSet} from "../helpers";
import {DeckObj, Filter, FragmentChildProps} from "../interfaces";
import InfoboxLastUpdated from "../components/InfoboxLastUpdated";
import UserData from "../UserData";
import Fragments from "../components/Fragments";
import InfoIcon from "../components/InfoIcon";

interface DeckDiscoverState {
	cardSearchExcludeKey?: number;
	cardSearchIncludeKey?: number;
	cards?: any[];
	filteredDecks: DeckObj[];
	loading?: boolean;
	showFilters?: boolean;
}

interface DeckDiscoverProps extends FragmentChildProps, React.ClassAttributes<DeckDiscover> {
	cardData: CardData;
	user: UserData;
	excludedCards?: string[];
	setExcludedCards?: (excludedCards: string[]) => void;
	gameType?: string;
	customGameType?: string;
	setGameType?: (gameType: string) => void;
	includedCards?: string[];
	setIncludedCards?: (includedCards: string[]) => void;
	opponentClass?: FilterOption;
	setOpponentClass?: (opponentClass: string) => void;
	personal?: string;
	setPersonal?: (personal: string) => void;
	playerClasses?: FilterOption[];
	setPlayerClasses?: (playerClasses: FilterOption[]) => void;
	rankRange?: string;
	setRankRange?: (rankRange: string) => void;
	region?: string;
	setRegion?: (region: string) => void;
	timeRange?: string;
	setTimeRange?: (timeRange: string) => void;
}

export default class DeckDiscover extends React.Component<DeckDiscoverProps, DeckDiscoverState> {
	private readonly dataManager: DataManager = new DataManager();

	constructor(props: DeckDiscoverProps, state: DeckDiscoverState) {
		super(props, state);
		this.state = {
			cardSearchExcludeKey: 0,
			cardSearchIncludeKey: 0,
			cards: null,
			filteredDecks: [],
			loading: true,
			showFilters: false,
		};
		this.updateFilteredDecks();
	}

	componentDidUpdate(prevProps: DeckDiscoverProps, prevState: DeckDiscoverState) {
		if (
			this.props.excludedCards !== prevProps.excludedCards ||
			this.props.gameType !== prevProps.gameType ||
			this.props.includedCards !== prevProps.includedCards ||
			this.props.opponentClass !== prevProps.opponentClass ||
			this.props.personal !== prevProps.personal ||
			!_.eq(this.props.playerClasses, prevProps.playerClasses) ||
			this.props.rankRange !== prevProps.rankRange ||
			this.props.region !== prevProps.region ||
			this.props.timeRange !== prevProps.timeRange ||
			this.props.cardData !== prevProps.cardData
		) {
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

	getDeckType(totalCost: number): string {
		return totalCost >= 100 ? "control" : (totalCost >= 80 ? "midrange" : "aggro");
	}

	getDeckElements(): Promise<any[]> {
		const deckElements = [];
		const playerClasses = this.props.playerClasses;
		const filteredCards = (key: string): any[] => {
			const array = this.props[key] || [];
			if(array.length == 1 && !array[0]) {
				return [];
			}
			return array.map((dbfId) => this.props.cardData.fromDbf(dbfId));
		};
		const includedCards = filteredCards("includedCards");
		const excludedCards = filteredCards("excludedCards");
		const missingIncludedCards = (deckList: any[]) => {
			return includedCards.some((card) => card && deckList.every((cardObj) => cardObj && cardObj.card.id !== card.id));
		};
		const containsExcludedCards = (deckList: any[]) => {
			return excludedCards.some((card) => card && deckList.some((cardObj) => cardObj.card.id === card.id));
		};
		const cardList = (cards) => cards.map((c: any[]) => {
			return {card: this.props.cardData.fromDbf(c[0]), count: c[1]};
		});
		const pushDeck = (deck: any, cards: any[]) => {
			deck.cards = cards;
			deckElements.push(deck);
		};
		if (this.props.personal && this.props.user.hasFeature("profiles")) {
			if (!this.dataManager.has("/decks/mine")) {
				this.setState({loading: true});
			}
			return this.dataManager.get("/decks/mine/").then(((myDecks: any[]) => {
				Object.keys(myDecks).forEach((deckId) => {
					const deck = Object.assign({}, myDecks[deckId]);
					if (playerClasses.length && playerClasses.indexOf(deck.player_class) === -1) {
						return;
					}
					const gameTypes = Object.keys(deck.game_types);
					if (gameTypes.indexOf("BGT_ARENA") !== -1) {
						return;
					}
					if (gameTypes.indexOf("BGT_" + this.props.gameType) === -1) {
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
					if (playerClasses.length && playerClasses.indexOf(key as FilterOption) === -1) {
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
		const selectedOpponent = this.props.opponentClass;
		const winrateField = selectedOpponent === "ALL" ? "win_rate" : "win_rate_vs_" + selectedOpponent;
		const numGamesField = selectedOpponent === "ALL" ? "total_games" : "total_games_vs_" + selectedOpponent;
		this.getDeckElements().then(((deckElements) => {
			const decks: DeckObj[] = [];
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
		let content = null;
		if (this.state.loading) {
			content = <h3 className="message-wrapper">Loading…</h3>;
		}
		else if (this.state.filteredDecks.length === 0) {
			if (this.props.personal && this.props.user.hasFeature("profiles")) {
				content = (
					<NoDecksMessage>
						<button
							className="btn btn-default"
							type="button"
							onClick={() => this.props.setPersonal(null)}
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
						<button className="btn btn-default" type="button" onClick={() => this.props.reset()}>
							Reset filters
						</button>
					</div>
				);
			}
		}
		else {
			content = (
				<Fragments
					defaults={{
						sortBy: "popularity",
						sortDirection: "descending",
						page: 1,
					}}
				>
					<DeckList
						decks={this.state.filteredDecks}
						pageSize={12}
						urlGameType={this.props.customGameType}
						helpMessage="Decks require at least 1000 recorded games in the selected time frame to be listed."
					/>
				</Fragments>
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
					selectedValue={this.props.personal}
					onClick={(value) => this.props.setPersonal(value)}
				>
					<InfoboxFilter value="true" disabled={!this.props.user.isAuthenticated()}>
						I have played (last 30 days)
						{loginLink}
					</InfoboxFilter>
				</InfoboxFilterGroup>,
			];
		}

		const selectedCards = (key: string) => {
			if (!this.props.cardData || !this.props[key]) {
				return undefined;
			}
			let cards = this.props[key].map((dbfId) => this.props.cardData.fromDbf(dbfId));
			cards = cards.filter((card) => !!card);
			return cards;
		};

		let filteredCards = Array.isArray(this.state.cards) ? this.state.cards : [];
		const gameType = this.props.gameType;
		if (gameType.endsWith("_STANDARD")) {
			filteredCards = filteredCards.filter((card) => isWildSet(card.set));
		}
		const playerClasses = this.props.playerClasses;
		if (playerClasses.length) {
			filteredCards = filteredCards.filter((card) => {
				const cardClass = card.cardClass;
				return cardClass === "NEUTRAL" || playerClasses.indexOf(cardClass) !== -1;
			});
		}

		const isPremium = !!this.props.user.isPremium();
		const premiumTabIndex = isPremium ? 0 : -1;

		return (
			<div className="deck-discover">
				<div className={filterClassNames.join(" ")} id="deck-discover-infobox">
					{backButton}
					<ResetHeader
						onReset={() => this.props.reset()}
						showReset={this.props.canBeReset}
					>
						Decks
					</ResetHeader>
					<section id="player-class-filter">
						<h2>
							Player Class
							<InfoIcon
								className="pull-right"
								header="Player Class Restriction"
								content={{
									click: (
										<p>
												Only show decks for specific classes.&nbsp;
												<span>Hold <kbd>Ctrl</kbd> to select multiple classes.</span>
										</p>
									),
									touch: "Only show decks for specific classes.",
								}}
							/>
						</h2>
						<ClassFilter
							filters="All"
							hideAll
							minimal
							multiSelect
							selectedClasses={this.props.playerClasses}
							selectionChanged={(selected) => this.props.setPlayerClasses(selected)}
						/>
					</section>
					<section id="opponent-class-filter">
						<PremiumWrapper
							isPremium={isPremium}
							infoHeader="Winrate by Opponent"
							infoContent={
								<p>
									See how various decks perform against a specific class at a glance!
									Only single classes at this time.
								</p>
							}>
							<h2>Opponent class</h2>
							<ClassFilter
								filters="All"
								hideAll
								minimal
								tabIndex={premiumTabIndex}
								selectedClasses={[this.props.opponentClass]}
								selectionChanged={(selected) => this.props.setOpponentClass(selected[0])}
							/>
						</PremiumWrapper>
					</section>
					<section id="include-cards-filter">
						<h2>Included Cards</h2>
						<CardSearch
							id="card-search-include"
							key={"cardinclude" + this.state.cardSearchIncludeKey}
							availableCards={filteredCards}
							onCardsChanged={(cards) => this.props.setIncludedCards(cards.map((card) => card.dbfId))}
							selectedCards={selectedCards("includedCards")}
						/>
					</section>
					<section id="exclude-cards-filter">
						<h2>Excluded Cards</h2>
						<CardSearch
							id="card-search-exclude"
							key={"cardexclude" + this.state.cardSearchExcludeKey}
							availableCards={filteredCards}
							onCardsChanged={(cards) => this.props.setExcludedCards(cards.map((card) => card.dbfId))}
							selectedCards={selectedCards("excludedCards")}
						/>
					</section>
					{personalFilters}
					<section id="game-mode-filter">
						<h2>Game Mode</h2>
						<InfoboxFilterGroup
							selectedValue={this.props.gameType}
							onClick={(value) => this.props.setGameType(value)}
						>
							<InfoboxFilter value="RANKED_STANDARD">Ranked Standard</InfoboxFilter>
							<InfoboxFilter value="RANKED_WILD">Ranked Wild</InfoboxFilter>
						</InfoboxFilterGroup>
					</section>
					<section id="time-frame-filter">
						<PremiumWrapper
							isPremium={isPremium}
							infoHeader="Time Frame"
							infoContent="Want to see which decks are hot right now? Look at data from a time frame of your choosing!"
						>
							<h2>Time frame</h2>
							<InfoboxFilterGroup
								locked={!this.props.user.isPremium()}
								selectedValue={this.props.timeRange}
								onClick={(value) => this.props.setTimeRange(value)}
								tabIndex={premiumTabIndex}
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
							isPremium={isPremium}
							infoHeader="Rank Range"
							infoContent="Ready to climb the ladder? Check out how decks perform at certain rank ranges!"
						>
							<h2>Rank range</h2>
							<InfoboxFilterGroup
								locked={!this.props.user.isPremium()}
								selectedValue={this.props.rankRange}
								onClick={(value) => this.props.setRankRange(value)}
								tabIndex={premiumTabIndex}
							>
								<InfoboxFilter value="LEGEND_THROUGH_TEN">Legend–10</InfoboxFilter>
								<InfoboxFilter value="ALL">Legend–25</InfoboxFilter>
							</InfoboxFilterGroup>
						</PremiumWrapper>
					</section>
					<section id="side-bar-data">
						<h2>Data</h2>
						<ul>
							<InfoboxLastUpdated dataManager={this.dataManager} url={this.getQueryName()}
												params={this.getParams()} />
						</ul>
					</section>
					{backButton}
				</div>
				<div className={contentClassNames.join(" ")}>
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
			GameType: this.props.gameType,
			RankRange: this.props.rankRange,
			TimeRange: this.props.timeRange,
			// Region: this.props.region,
		};
	}
}
