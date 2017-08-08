import * as React from "react";
import * as _ from "lodash";
import CardData from "../CardData";
import CardSearch from "../components/CardSearch";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import DeckList from "../components/DeckList";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import NoDecksMessage from "../components/NoDecksMessage";
import ResetHeader from "../components/ResetHeader";
import DataManager from "../DataManager";
import {cardSorting, isWildSet, sortCards} from "../helpers";
import {DeckObj, FragmentChildProps, TableData} from "../interfaces";
import InfoboxLastUpdated from "../components/InfoboxLastUpdated";
import UserData from "../UserData";
import Fragments from "../components/Fragments";
import InfoIcon from "../components/InfoIcon";
import {decode as decodeDeckstring} from "deckstrings";
import {Limit} from "../components/ObjectSearch";

interface MyDecksState {
	account?: string;
	cardSearchExcludeKey?: number;
	cardSearchIncludeKey?: number;
	cards?: any[];
	filteredDecks: DeckObj[];
	loading?: boolean;
	showFilters?: boolean;
	hasData?: boolean;
}

interface MyDecksProps extends FragmentChildProps, React.ClassAttributes<MyDecks> {
	cardData: CardData;
	excludedCards?: string[];
	setExcludedCards?: (excludedCards: string[]) => void;
	gameType?: string;
	setGameType?: (gameType: string) => void;
	includedCards?: string[];
	setIncludedCards?: (includedCards: string[]) => void;
	playerClasses?: FilterOption[];
	setPlayerClasses?: (playerClasses: FilterOption[]) => void;
	includedSet?: string;
	setIncludedSet?: (set: string) => void;
	timeRange?: string;
	setTimeRange?: (timeRange: string) => void;
}

export default class MyDecks extends React.Component<MyDecksProps, MyDecksState> {
	private deckListsFragmentsRef;

	constructor(props: MyDecksProps, state: MyDecksState) {
		super(props, state);
		this.state = {
			account: UserData.getDefaultAccountKey(),
			cardSearchExcludeKey: 0,
			cardSearchIncludeKey: 0,
			cards: null,
			filteredDecks: [],
			loading: true,
			showFilters: false,
			hasData: false,
		};
		this.updateFilteredDecks();
	}

	componentDidUpdate(prevProps: MyDecksProps, prevState: MyDecksState) {
		if (
			this.state.account !== prevState.account ||
			this.props.excludedCards !== prevProps.excludedCards ||
			this.props.gameType !== prevProps.gameType ||
			this.props.includedCards !== prevProps.includedCards ||
			!_.eq(this.props.playerClasses, prevProps.playerClasses) ||
			this.props.cardData !== prevProps.cardData ||
			this.props.includedSet !== prevProps.includedSet ||
			this.props.timeRange !== prevProps.timeRange
		) {
			this.updateFilteredDecks();
			this.deckListsFragmentsRef && this.deckListsFragmentsRef.reset("page");
		}
	}

	componentWillReceiveProps(nextProps: MyDecksProps) {
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

	getDeckElements(): Promise<any[]> {
		const deckElements = [];
		const filteredCards = (key: string): any[] => {
			const array = this.props[key] || [];
			if (array.length === 1 && !array[0]) {
				return [];
			}
			const cards = [];
			array.forEach((dbfId) => {
				const index = cards.findIndex((obj) => {
					return obj.card && +obj.card.dbfId === +dbfId;
				});
				if (index !== -1) {
					cards[index].count++;
				}
				else {
					cards.push({
						card: this.props.cardData.fromDbf(dbfId),
						count: 1,
					});
				}
			});
			return cards;
		};
		const includedCards = filteredCards("includedCards");
		const excludedCards = filteredCards("excludedCards");
		const missingIncludedCards = (deckList: any[]) => {
			return includedCards.some((includedCardObj) => {
				return includedCardObj && deckList.every((cardObj) => {
						return cardObj && cardObj.card.id !== includedCardObj.card.id || cardObj.count < includedCardObj.count;
					});
			});
		};
		const containsExcludedCards = (deckList: any[]) => {
			return excludedCards.some((excludedCardObj) => {
				return excludedCardObj && deckList.some((cardObj) => cardObj.card.id === excludedCardObj.card.id);
			});
		};
		const cardList = (cards) => cards.map((c: any[]) => {
			return {card: this.props.cardData.fromDbf(c[0]), count: c[1]};
		});
		const pushDeck = (deck: any, cards: any[]) => {
			deck.cards = cards;
			deckElements.push(deck);
		};

		const params = this.getPersonalParams();

		if (!DataManager.has("single_account_lo_decks_summary", params)
			|| !DataManager.has("list_decks_by_win_rate", {GameType: this.props.gameType})) {
			this.setState({loading: true});
		}

		return DataManager.get("list_decks_by_win_rate", {GameType: this.props.gameType}).then((deckData) => {
			return DataManager.get("single_account_lo_decks_summary", params).then((data: TableData) => {
				if (data && data.series) {
					Object.keys(data.series.data).forEach((playerClass) => {
						if (this.props.playerClasses.length && this.props.playerClasses.indexOf(playerClass as FilterOption) === -1) {
							return;
						}
						data.series.data[playerClass].forEach((deck) => {
							const cards = cardList(JSON.parse(deck.deck_list));
							if (missingIncludedCards(cards) || containsExcludedCards(cards)) {
								return;
							}
							if (
								this.props.includedSet !== "ALL" &&
								cards.every((cardObj) => cardObj.card.set !== this.props.includedSet)
							) {
								return;
							}
							deck.player_class = playerClass;
							const globalDeck = deckData.series.data[playerClass].find((d) => d.deck_id === deck.deck_id);
							deck.noGlobalData = !globalDeck;
							deck.archetype_id = deck.archetype_id || globalDeck && globalDeck.archetype_id;
							pushDeck(deck, cards);
						});
					});
				}
				return deckElements;
			});
		});
	}

	updateFilteredDecks(): void {
		if (!this.props.cardData) {
			return;
		}
		this.getDeckElements().then(((deckElements) => {
			const decks: DeckObj[] = deckElements.map((deck) => {
				return {
					archetypeId: deck.archetype_id,
					cards: deck.cards,
					deckId: deck.deck_id,
					duration: deck.avg_game_length_seconds,
					lastPlayed: deck.last_played && new Date(deck.last_played),
					noGlobalData: deck.noGlobalData,
					numGames: deck.total_games,
					playerClass: deck.player_class,
					winrate: deck.win_rate,
				};
			});
			this.setState({filteredDecks: decks, hasData: true, loading: false});
		})).catch((reason) => {
			if (reason === 204) {
				this.setState({loading: false});
				return;
			}
			if (reason !== "Params changed" && reason !== 202) {
				console.error(reason);
			}
		});
	}

	render(): JSX.Element {
		let content = null;
		const userAccounts = UserData.getAccounts();

		if (!userAccounts.length) {
			content = (
				<div className="message-wrapper">
					<h2>Link your Hearthstone account</h2>
					<p>
						Play a game and <a href="/games/mine/">upload the replay</a> for your deck statistics to start appearing here.
					</p>
					<p className="text-muted">
						Note: It may take up to an hour for new data to appear on this page.<br />
						<a href="/contact/">Contact us if you keep seeing this message.</a>
					</p>
				</div>
			);
		}
		else if (this.state.loading) {
			content = <h3 className="message-wrapper">Loading…</h3>;
		}
		else if (!this.state.hasData) {
			content = (
				<div className="message-wrapper">
					<h2>All set!</h2>
					<p>We've successfully linked your Hearthstone account and will analyze incoming replays.</p>
					<p>After you've played some games you'll find statistics for all the decks you play right here.</p>
					<p className="text-muted">Note: It may take up to an hour for new data to appear on this page.</p>
				</div>
			);
		}
		else if (this.state.filteredDecks.length === 0) {
			let resetButton = null;
			if (this.props.canBeReset) {
				resetButton = (
					<button className="btn btn-default" type="button" onClick={() => this.props.reset()}>
						Reset filters
					</button>
				);
			}
			content = <NoDecksMessage>{resetButton}</NoDecksMessage>;
		}
		else {
			content = (
				<Fragments
					defaults={{
						sortBy: "lastPlayed",
						sortDirection: "descending",
						page: 1,
					}}
					ref={(ref) => this.deckListsFragmentsRef}
				>
					<DeckList
						decks={this.state.filteredDecks}
						pageSize={12}
						hrefTab={"my-statistics"}
						lastPlayedColumn
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
				Back to my decks
			</button>
		);

		const accounts = userAccounts.map((acc) => (
			<InfoboxFilter value={acc.region + "-" + acc.lo}>
				{acc.display}
			</InfoboxFilter>
		));

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
			filteredCards = filteredCards.filter((card) => !isWildSet(card.set));
		}
		const playerClasses = this.props.playerClasses;
		if (playerClasses.length) {
			filteredCards = filteredCards.filter((card) => {
				const cardClass = card.cardClass;
				return cardClass === "NEUTRAL" || playerClasses.indexOf(cardClass) !== -1;
			});
		}

		return (
			<div className="deck-discover">
				<div className={filterClassNames.join(" ")} id="deck-discover-infobox">
					{backButton}
					<ResetHeader
						onReset={() => this.props.reset()}
						showReset={this.props.canBeReset}
					>
						My Decks
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
					<section id="include-cards-filter">
						<h2 id="card-search-include-label">Included Cards</h2>
						<InfoboxFilterGroup
							deselectable
							selectedValue={this.props.includedSet}
							onClick={(value) => this.props.setIncludedSet(value || "ALL")}
						>
							<InfoboxFilter value="ICECROWN">Latest Expansion</InfoboxFilter>
						</InfoboxFilterGroup>
						<CardSearch
							id="card-search-include"
							label="card-search-include-label"
							key={"cardinclude" + this.state.cardSearchIncludeKey}
							availableCards={filteredCards}
							onCardsChanged={(cards) => this.props.setIncludedCards(cards.map((card) => card.dbfId))}
							selectedCards={selectedCards("includedCards")}
							cardLimit={Limit.DOUBLE}
							onPaste={(e) => {
								const input = e.clipboardData.getData("text/plain");
								const lines = input.trim().split("\n").filter((line) => !line.startsWith("#"));
								let result = null;
								try {
									result = decodeDeckstring(lines[0]);
								}
								catch (e) {
									return;
								}
								e.preventDefault();
								const cards = [];
								for (const tuple of result.cards) {
									const [dbfId, count] = tuple;
									for (let i = 0; i < count; i++) {
										cards.push(this.props.cardData.fromDbf(dbfId));
									}
								}
								cards.sort(sortCards);
								this.props.setIncludedCards(cards.map((card) => card.dbfId));
							}}
						/>
					</section>
					<section id="exclude-cards-filter">
						<h2 id="card-search-exclude-label">Excluded Cards</h2>
						<CardSearch
							id="card-search-exclude"
							label="card-search-exclude-label"
							key={"cardexclude" + this.state.cardSearchExcludeKey}
							availableCards={filteredCards}
							onCardsChanged={(cards) => this.props.setExcludedCards(cards.map((card) => card.dbfId))}
							selectedCards={selectedCards("excludedCards")}
							cardLimit={Limit.SINGLE}
						/>
					</section>
					{accounts.length > 0  ? <section id="account-filter">
						<InfoboxFilterGroup
							header="Account"
							selectedValue={this.state.account}
							onClick={(account) => {
								UserData.setDefaultAccount(account);
								this.setState({account});
							}}
							tabIndex={accounts.length > 1 ? 0 : -1}
						>
							{accounts}
						</InfoboxFilterGroup>
					</section> : null}
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
						<h2>Time Frame</h2>
						<InfoboxFilterGroup
							selectedValue={this.props.timeRange}
							onClick={(value) => this.props.setTimeRange(value)}
						>
							<InfoboxFilter value="PREVIOUS_SEASON">Previous Season</InfoboxFilter>
							<InfoboxFilter value="CURRENT_SEASON">Current Season</InfoboxFilter>
							<InfoboxFilter value="LAST_30_DAYS">Last 30 days</InfoboxFilter>
							<InfoboxFilter value="LAST_60_DAYS">Last 60 days</InfoboxFilter>
						</InfoboxFilterGroup>
					</section>
					<section id="side-bar-data">
						<h2>Data</h2>
						<ul>
							<InfoboxLastUpdated
								url={"single_account_lo_decks_summary"}
								params={this.getPersonalParams()}
							/>
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

	getPersonalParams(): any {
		const getRegion = (account: string) => account && account.split("-")[0];
		const getLo = (account: string) => account && account.split("-")[1];
		return {
			Region: getRegion(this.state.account),
			account_lo: getLo(this.state.account),
			GameType: this.props.gameType,
			TimeRange: this.props.timeRange,
		};
	}
}
