import * as React from "react";
import CardData from "../CardData";
import CardImage from "../components/CardImage";
import CardTile from "../components/CardTile";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import MyCardStatsTable from "../components/deckdetail/MyCardStatsTable";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import PremiumWrapper from "../components/PremiumWrapper";
import ResetHeader from "../components/ResetHeader";
import SortableTable, {SortDirection} from "../components/SortableTable";
import {
	cardSorting, cleanText, isError, isLoading, setNames, toDynamicFixed, toPrettyNumber,
	toTitleCase, wildSets, winrateData,
} from "../helpers";
import {ChartSeries, TableData, TableQueryData} from "../interfaces";
import QueryManager from "../QueryManager";
import {
	genCacheKey, getQueryMapArray, getQueryMapDiff, getQueryMapFromLocation, parseQuery,
	QueryMap, queryMapHasChanges, setLocationQueryString, setQueryMap, toQueryString,
} from "../QueryParser";

interface CardFilters {
	cost: any;
	format: any;
	mechanics: any;
	playerClass: any;
	race: any;
	rarity: any;
	set: any;
	type: any;
}

interface CardTableData {
	[key: string]: TableData;
}

export type ViewType = "cards" | "statistics" | "personal";

interface CardDiscoverState {
	cards?: any[];
	filteredCards: any[];
	filterCounts: CardFilters;
	numCards?: number;
	personalCardData?: TableData;
	queryMap?: QueryMap;
	showFilters?: boolean;
	topCardsIncluded?: CardTableData;
	topCardsPlayed?: CardTableData;
}

interface CardDiscoverProps extends React.ClassAttributes<CardDiscover> {
	cardData: CardData;
	userIsPremium: boolean;
	viewType: ViewType;
}

export default class CardDiscover extends React.Component<CardDiscoverProps, CardDiscoverState> {
	private readonly queryManager: QueryManager = new QueryManager();
	readonly filters = {
		cost: [0, 1, 2, 3, 4, 5, 6, 7],
		format: ["standard"],
		mechanics: [
			"ENRAGED", "DEATHRATTLE", "TAUNT", "BATTLECRY", "CHARGE", "DIVINE_SHIELD", "WINDFURY",
			"CHOOSE_ONE", "INSPIRE", "JADE_GOLEM", "COMBO", "FREEZE", "STEALTH", "OVERLOAD",
			"POISONOUS", "DISCOVER",
		],
		playerClass: ["DRUID", "HUNTER", "MAGE", "PALADIN", "PRIEST", "ROGUE", "SHAMAN", "WARLOCK", "WARRIOR", "NEUTRAL"],
		race: ["BEAST", "DEMON", "DRAGON", "ELEMENTAL", "MECHANICAL", "MURLOC", "PIRATE", "TOTEM"],
		rarity: ["FREE", "COMMON", "RARE", "EPIC", "LEGENDARY"],
		set: ["CORE", "EXPERT1", "GANGS", "KARA", "OG", "LOE", "TGT", "BRM", "GVG", "NAXX", "PROMO", "REWARD"],
		type: ["MINION", "SPELL", "WEAPON"],
	};
	readonly multiClassGroups = {
		GRIMY_GOONS: ["HUNTER", "PALADIN", "WARRIOR"],
		JADE_LOTUS: ["DRUID", "ROGUE", "SHAMAN"],
		KABAL: ["MAGE", "PRIEST", "WARLOCK"],
	};
	readonly placeholderUrl = STATIC_URL + "images/cardback_placeholder_kabal.png";
	readonly defaultQueryMap: QueryMap = {
		cost: "",
		filterSparse: "",
		format: "",
		gameType: "RANKED_STANDARD",
		mechanics: "",
		playerClass: "ALL",
		race: "",
		rankRange: "ALL",
		rarity: "",
		set: "",
		sortBy: "timesPlayed",
		sortDirection: "descending",
		text: "",
		timeRange: "LAST_14_DAYS",
		type: "",
	};

	private readonly allowedValues = {
		gameType: ["RANKED_STANDARD", "RANKED_WILD", "ARENA"],
		rankRange: [],
		region: [],
		timeRange: ["LAST_14_DAYS"],
	};

	private readonly allowedValuesPremium = {
		gameType: ["RANKED_STANDARD", "RANKED_WILD", "ARENA"],
		rankRange: ["LEGEND_THROUGH_TEN"],
		region: [],
		timeRange: ["LAST_1_DAY", "LAST_3_DAYS", "LAST_7_DAYS", "LAST_14_DAYS"],
	};

	constructor(props: CardDiscoverProps, state: CardDiscoverState) {
		super(props, state);
		this.state = {
			cards: null,
			filterCounts: null,
			filteredCards: null,
			numCards: 24,
			personalCardData: "loading",
			queryMap: getQueryMapFromLocation(this.defaultQueryMap, this.getAllowedValues()),
			showFilters: false,
			topCardsIncluded: {},
			topCardsPlayed: {},
		};
		switch (this.props.viewType) {
			case "cards":
				const image = new Image();
				image.src = this.placeholderUrl;
				break;
			case "statistics":
				this.fetchIncluded();
				this.fetchPlayed();
				break;
			case "personal":
				this.fetchPersonal();
				break;
		}
		this.filters.mechanics.sort();
	}

	getAllowedValues(): any {
		return this.props.userIsPremium ? this.allowedValuesPremium : this.allowedValues;
	}

	onSearchScroll(): void {
		if (this.state.filteredCards.length > this.state.numCards) {
			const atBottom = () => document.body.scrollTop + (window.innerHeight + 100) >= document.body.scrollHeight;
			if (atBottom()) {
				window.setTimeout(() => {
					if (atBottom()) {
						this.setState({numCards: this.state.numCards + 10});
					}
				}, 300);
			}
		}
	}

	componentDidMount() {
		document.addEventListener("scroll", () => this.onSearchScroll());
	}

	componentDidUnmount() {
		document.removeEventListener("scroll", () => this.onSearchScroll());
	}

	componentDidUpdate(prevProps: CardDiscoverProps, prevState: CardDiscoverState) {
		if (this.props.viewType === "statistics") {
			const cacheKey = genCacheKey(this);
			const prevCacheKey = genCacheKey(this, prevState);
			const includedCards = this.state.topCardsIncluded[cacheKey];
			const playedCards = this.state.topCardsPlayed[cacheKey];

			if (cacheKey !== prevCacheKey) {
				if (!includedCards || includedCards === "error") {
					this.fetchIncluded();
				}

				if (!playedCards || playedCards === "error") {
					this.fetchPlayed();
				}
			}

			if (prevState.topCardsIncluded[cacheKey] !== includedCards
				|| prevState.topCardsPlayed[cacheKey] !== playedCards) {
				this.updateFilteredCards();
			}
		}
		setLocationQueryString(this.state.queryMap, this.defaultQueryMap);

		if (!this.state.filteredCards || prevState.queryMap !== this.state.queryMap) {
			this.updateFilteredCards();
		}
	}

	updateFilteredCards(): void {
		if (!this.state.cards) {
			return;
		}
		const filteredByProp = {};
		const filterKeys = Object.keys(this.filters);
		filterKeys.forEach((key) => filteredByProp[key] = []);
		const filteredCards = [];
		const sparseDict = this.state.queryMap.filterSparse === "true" ? this.getSparseFilterDicts() : [];

		this.state.cards.forEach((card) => {
			filterKeys.forEach((x) => {
				if (!this.filter(card, x, sparseDict)) {
					filteredByProp[x].push(card);
				}
			});
			if (!this.filter(card, undefined, sparseDict)) {
				filteredCards.push(card);
			}
		});

		this.setState({filteredCards, filterCounts: this.filterCounts(filteredByProp as CardFilters)});
	}

	getSparseFilterDicts(): any[] {
		// build dictionaries from the tabledata to optimize lookup time when filtering
		const sparseDict = [];
		if (this.props.viewType === "statistics") {
			const cacheKey = genCacheKey(this);
			const playedTd = this.state.topCardsPlayed[cacheKey];
			const includedTd = this.state.topCardsIncluded[cacheKey];
			if (!isLoading(playedTd) && !isLoading(includedTd) && !isError(playedTd) && !isError(includedTd)) {
				sparseDict[0] = {};
				const playedData = (playedTd as TableQueryData).series.data[this.state.queryMap.playerClass];
				playedData.forEach((data) => {
					sparseDict[0][data.dbf_id] = data.popularity;
				});
				sparseDict[1] = {};
				const includedData = (includedTd as TableQueryData).series.data[this.state.queryMap.playerClass];
				includedData.forEach((data) => {
					sparseDict[1][data.dbf_id] = data.popularity;
				});
			}
		}
		else if (this.props.viewType === "personal") {
			if (!isLoading(this.state.personalCardData) && !isError(this.state.personalCardData)) {
				sparseDict[0] = {};
				const personalCardData = (this.state.personalCardData as TableQueryData).series.data.ALL;
				personalCardData.forEach((data) => {
					sparseDict[0][data.dbf_id] = data.total_games || data.times_played;
				});
			}
		}
		return sparseDict;
	}

	componentWillReceiveProps(nextProps: CardDiscoverProps) {
		if (!this.state.cards && nextProps.cardData) {
			const cards = [];
			nextProps.cardData.all().forEach((card) => {
				if (card.name && card.collectible && this.filters.type.indexOf(card.type) !== -1) {
					cards.push(card);
				}
			});
			cards.sort(cardSorting);
			this.setState({cards});
		}
	}

	render(): JSX.Element {
		const cacheKey = genCacheKey(this);
		const played = this.state.topCardsPlayed[cacheKey];
		const included = this.state.topCardsIncluded[cacheKey];
		const viewType = this.props.viewType;
		const personal = this.state.personalCardData;

		let content = null;
		if ((viewType === "personal" && isLoading(personal))
			|| (viewType === "statistics" && (isLoading(played) || isLoading(included))) || !this.props.cardData) {
			content = [
				<div className="message-wrapper">
					<h2>Loading...</h2>
				</div>,
			];
		}
		else if ((viewType === "personal" && isError(personal))
			|| (viewType === "statistics" && (isError(played) || isError(included)))) {
			content = [
				<div className="message-wrapper">
					<h2>Something went wrong</h2>
					Please check back later.
				</div>,
			];
		}
		else if (this.state.filteredCards && !this.state.filteredCards.length) {
			content = (
				<div className="message-wrapper">
					<h2>No cards found</h2>
					<button className="btn btn-default" type="button" onClick={() => this.resetFilters()}>Reset filters</button>
				</div>
			);
		}
		else if (this.state.filteredCards) {
			if (viewType === "personal") {
				const onSortChanged = (newSortBy: string, newSortDirection: SortDirection): void => {
					const queryMap = Object.assign({}, this.state.queryMap);
					queryMap.sortBy = newSortBy;
					queryMap.sortDirection = newSortDirection;
					this.setState({queryMap});
				};

				content = [
					<div className="table-wrapper">
						<MyCardStatsTable
							cards={this.state.filteredCards || []}
							numCards={this.state.numCards}
							onSortChanged={onSortChanged}
							personalData={this.state.personalCardData}
							sortBy={this.state.queryMap.sortBy}
							sortDirection={this.state.queryMap.sortDirection as SortDirection}
						/>
					</div>,
				];
			}
			else if (viewType === "statistics") {
				content = [
					<div className="table-wrapper">
						{this.buildCardTable(included as TableQueryData, played as TableQueryData)}
					</div>,
				];
			}
			else {
				const tiles = [];
				this.state.filteredCards.forEach((card) => {
					if (tiles.length < this.state.numCards) {
						tiles.push(
							<CardImage
								cardId={card.id}
								dbfId={card.dbfId}
								placeholder={this.placeholderUrl}
								key={card.id}
							/>,
						);
					}
				});
				content = [
					<div id="card-list">
						{tiles}
					</div>,
				];
			}
			if (this.state.filteredCards.length > this.state.numCards) {
				content.push(
					<div id="more-button-wrapper">
						<button
							type="button"
							className="btn btn-default"
							onClick={() => this.setState({numCards: this.state.numCards + 10})}
						>
							Show more...
						</button>
					</div>,
				);
			}
		}

		let search = null;

		const filterClassNames = ["infobox full-xs"];
		const contentClassNames = ["card-list-wrapper"];
		if (!this.state.showFilters) {
			filterClassNames.push("hidden-xs");
			let clear = null;
			if (this.state.queryMap["text"]) {
				clear = (
					<span className="glyphicon glyphicon-remove form-control-feedback" onClick={() => setQueryMap(this, "text", "")} />
				);
			}
			search = (
				<div className="search-wrapper">
					<div className="form-group has-feedback">
						<input
							autoFocus
							placeholder="Search..."
							type="search"
							className="form-control"
							value={this.state.queryMap["text"]}
							onChange={(x) => setQueryMap(this, "text", x.target["value"])}
						/>
						<span className="glyphicon glyphicon-search form-control-feedback"/>
						{clear}
					</div>
				</div>
			);
		}
		else {
			contentClassNames.push("hidden-xs");
		}

		const backButton = (
			<button
				className="btn btn-primary btn-full visible-xs"
				type="button"
				onClick={() => this.setState({showFilters: false})}
			>
				Back to card list
			</button>
		);

		return (
			<div className="card-discover">
				<aside className={filterClassNames.join(" ")} id="card-discover-infobox">
					{backButton}
					{this.buildFilters()}
					{backButton}
				</aside>
				<main className={contentClassNames.join(" ")}>
					<button
						className="btn btn-default visible-xs"
						id="filter-button"
						type="button"
						onClick={() => this.setState({showFilters: !this.state.showFilters})}
					>
						<span className="glyphicon glyphicon-filter"/>
						Filters
					</button>
					{search}
					{content}
				</main>
			</div>
		);
	}

	buildCardTable(includedData: TableQueryData, playedData: TableQueryData): JSX.Element {
		const rows = [];
		const cardObjs = [];
		const selectedClass = this.state.queryMap["playerClass"];

		this.state.filteredCards && this.state.filteredCards.forEach((card) => {
			const included = (
				includedData.series.data[selectedClass === "NEUTRAL" ? "ALL" : selectedClass].find((x) => x.dbf_id === card.dbfId)
			);
			const played = (
				playedData.series.data[selectedClass === "NEUTRAL" ? "ALL" : selectedClass].find((x) => x.dbf_id === card.dbfId)
			);
			const includedCount = included && +included.count;
			const includedDecks = included && +included.decks;
			const includedPopularity = included && +included.popularity;
			const includedWinrate = included && +included.win_rate;
			const playedPopularity = played && +played.popularity;
			const playedWinrate = played && +played.win_rate;
			const timesPlayed = played && +played.total;
			cardObjs.push({
				card, includedCount, includedDecks, includedPopularity, includedWinrate,
				playedPopularity, playedWinrate, timesPlayed,
			});
		});

		const sortDirection = this.state.queryMap["sortDirection"] as SortDirection;
		const direction = sortDirection === "descending" ? 1 : -1;
		const sortBy = this.state.queryMap["sortBy"];

		if (sortBy === "card") {
			cardObjs.sort((a, b) => cardSorting(a, b, -direction));
		}
		else {
			cardObjs.sort((a, b) => ((b[sortBy] || 0) - (a[sortBy] || 0)) * direction);
		}

		const onSortChanged = (sortBy: string, sortDirection: SortDirection): void => {
			const queryMap = Object.assign({}, this.state.queryMap);
			queryMap.sortBy = sortBy;
			queryMap.sortDirection = sortDirection;
			this.setState({queryMap});
		};

		cardObjs.slice(0, this.state.numCards).forEach((obj) => {
			const playedPopularity = " (" + (obj.playedPopularity ? toDynamicFixed(obj.playedPopularity) + "%" : "0%") + ")";
			const includedWrData = obj.includedWinrate && winrateData(50, obj.includedWinrate, 3);
			const playedWrData = obj.playedWinrate && winrateData(50, obj.playedWinrate, 3);
			let url = "/cards/" + obj.card.dbfId + "/";
			if (this.state.queryMap.gameType && this.state.queryMap.gameType !== "RANKED_STANDARD") {
				url += "#gameType=" + this.state.queryMap.gameType;
			}
			rows.push(
				<tr>
					<td>
						<div className="card-wrapper">
							<a href={url}>
								<CardTile card={obj.card} count={1} rarityColored height={34} tooltip />
							</a>
						</div>
					</td>
					<td>
						{obj.includedPopularity ? toDynamicFixed(obj.includedPopularity) + "%" : "0%"}
					</td>
					<td>
						{obj.includedCount ? obj.includedCount : "-"}
					</td>
					<td style={{color: includedWrData && includedWrData.color}}>
						{obj.includedWinrate ? toDynamicFixed(obj.includedWinrate) + "%" : "-"}
					</td>
					<td>
						{(obj.timesPlayed ? toPrettyNumber(obj.timesPlayed) : "0") + playedPopularity}
					</td>
					<td style={{color: playedWrData && playedWrData.color}}>
						{obj.playedWinrate ? toDynamicFixed(obj.playedWinrate) + "%" : "-"}
					</td>
				</tr>,
			);
		});

		const tableHeaders = [
			{key: "card", text: "Card", defaultSortDirection: "ascending" as SortDirection},
			{key: "includedPopularity", text: "In % of decks", infoHeader: "Included in % of decks", infoText: "Percentage of decks that include at least one copy of the card."},
			{key: "includedCount", text: "Copies", infoHeader: "Copies in deck", infoText: "Average number of copies in a deck."},
			{key: "includedWinrate", text: "Deck winrate", infoHeader: "Deck Winrate", infoText: "Average winrate of decks that include this card."},
			{key: "timesPlayed", text: "Times played", infoHeader: "Times played", infoText: "Number of times the card was played."},
			{key: "playedWinrate", text: "Played winrate", infoHeader: "Winrate when played", infoText: "Ave winrate of matches where the card was played."},
		];

		return (
			<SortableTable sortBy={sortBy} sortDirection={sortDirection} onSortChanged={onSortChanged} headers={tableHeaders}>
				{rows}
			</SortableTable>
		);
	}

	filterCounts(cardFilters: CardFilters) : CardFilters {
		const filters = {
			cost: {},
			format: {},
			mechanics: {},
			playerClass: {},
			race: {},
			rarity: {},
			set: {},
			type: {},
		};

		Object.keys(filters).forEach((key) => {
			cardFilters[key].forEach((card) => {
				if (key === "mechanics") {
					card.mechanics && card.mechanics.forEach((m) => {
						filters.mechanics[m] = (filters.mechanics[m] || 0) + 1;
					});
				}
				else if (key === "format") {
					if (wildSets.indexOf(card.set) === -1){
						filters.format["standard"] = (filters.format["standard"] || 0) + 1;
					}
				}
				else if (key === "cost") {
					if (card.cost !== undefined) {
						const cost = "" + Math.min(card.cost, 7);
						filters.cost[cost] = (filters.cost[cost] || 0) + 1;
					}
				}
				else {
					const prop = card[key];
					if (prop !== undefined) {
						filters[key]["" + prop] = (filters[key]["" + prop] || 0) + 1;
					}
				}
			});
		});

		return filters;
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

	buildFilters(): JSX.Element[] {
		const showReset = queryMapHasChanges(this.state.queryMap, this.getDefeaultQueryMap());
		const viewType = this.props.viewType;

		const filters = [
			<ResetHeader onReset={() => this.resetFilters()} showReset={showReset}>
				{viewType === "cards" ? "Gallery" : (viewType === "statistics" ? "Cards" : "My Cards")}
			</ResetHeader>,
		];

		if (viewType === "cards" || viewType === "personal") {
			filters.push(
				<h2>Card class</h2>,
				<ClassFilter
					filters="AllNeutral"
					hideAll
					minimal
					multiSelect={false}
					selectedClasses={[this.state.queryMap["playerClass"] as FilterOption]}
					selectionChanged={(selected) => setQueryMap(this, "playerClass", selected[0])}
				/>,
			);
		}
		else {
			filters.push(
				<h2>Deck Class</h2>,
				<ClassFilter
					filters="All"
					hideAll
					minimal
					multiSelect={false}
					selectedClasses={[this.state.queryMap["playerClass"] as FilterOption]}
					selectionChanged={(selected) => setQueryMap(this, "playerClass", selected[0])}
				/>,
				<InfoboxFilterGroup
					deselectable
					selectedValue={this.state.queryMap["exclude"]}
					onClick={(value) => setQueryMap(this, "exclude", value)}
				>
					<InfoboxFilter value="neutral">Class cards only</InfoboxFilter>
					<InfoboxFilter value="class">Neutral cards only</InfoboxFilter>
				</InfoboxFilterGroup>,
				<section id="mode-filter">
					<InfoboxFilterGroup
						header="Mode"
						selectedValue={this.state.queryMap["gameType"]}
						onClick={(value) => setQueryMap(this, "gameType", value)}
					>
						<InfoboxFilter value="RANKED_STANDARD">Ranked Standard</InfoboxFilter>
						<InfoboxFilter value="RANKED_WILD">Ranked Wild</InfoboxFilter>
						<InfoboxFilter disabled={this.state.queryMap["rankRange"] === "LEGEND_THROUGH_TEN"} value="ARENA">
							Arena
						</InfoboxFilter>
					</InfoboxFilterGroup>
				</section>,
				<PremiumWrapper
					isPremium={this.props.userIsPremium}
					infoHeader="Time frame"
					infoContent="Get the most recent data on what cards are hot right now!"
				>
					<InfoboxFilterGroup
						header="Time frame"
						locked={!this.props.userIsPremium}
						selectedValue={this.state.queryMap["timeRange"]}
						onClick={(value) => setQueryMap(this, "timeRange", value)}
					>
						<InfoboxFilter value="LAST_1_DAY">Yesterday</InfoboxFilter>
						<InfoboxFilter value="LAST_3_DAYS">Last 3 days</InfoboxFilter>
						<InfoboxFilter value="LAST_7_DAYS">Last 7 days</InfoboxFilter>
						<InfoboxFilter value="LAST_14_DAYS">Last 14 days</InfoboxFilter>
					</InfoboxFilterGroup>
				</PremiumWrapper>,
				<PremiumWrapper
					isPremium={this.props.userIsPremium}
					infoHeader="Rank range"
					infoContent="Check out what cards get played on the higher ranks!"
				>
					<InfoboxFilterGroup
						header="Rank range"
						locked={!this.props.userIsPremium}
						selectedValue={this.state.queryMap["rankRange"]} onClick={(value) => setQueryMap(this, "rankRange", value)}
					>
						<InfoboxFilter disabled={this.state.queryMap["gameType"] === "ARENA"} value="LEGEND_THROUGH_TEN">
							Legend–10
						</InfoboxFilter>
						<InfoboxFilter disabled={this.state.queryMap["gameType"] === "ARENA"} value="ALL">Legend–25</InfoboxFilter>
					</InfoboxFilterGroup>
				</PremiumWrapper>,
			);
		}

		if (viewType === "statistics" || viewType === "personal") {
			filters.push(
				<h2>Data</h2>,
				<InfoboxFilterGroup
					deselectable
					selectedValue={this.state.queryMap["filterSparse"]}
					onClick={(value) => setQueryMap(this, "filterSparse", value)}
				>
					<InfoboxFilter value="true">Hide sparse data</InfoboxFilter>
				</InfoboxFilterGroup>,
			);
		}

		const onClick = (value: string, sender: string, key: string) => {
			return this.state.filterCounts && this.state.filterCounts[key] && this.onFilterItemClick(key, sender, value);
		};

		filters.push(
			<InfoboxFilterGroup
				key="costs"
				header="Cost"
				deselectable
				classNames={["filter-list-cost"]}
				selectedValue={getQueryMapArray(this.state.queryMap, "cost")}
				onClick={(value, sender) => onClick(value, sender, "cost")}
			>
				{this.buildCostFilters(this.state.filterCounts && this.state.filterCounts.cost)}
			</InfoboxFilterGroup>,
			<InfoboxFilterGroup
				key="rarities"
				header="Rarity"
				deselectable
				selectedValue={getQueryMapArray(this.state.queryMap, "rarity")}
				onClick={(value, sender) => onClick(value, sender, "rarity")}
			>
				{this.buildFilterItems("rarity", this.state.filterCounts && this.state.filterCounts.rarity)}
			</InfoboxFilterGroup>,
			<InfoboxFilterGroup
				key="sets"
				header="Set"
				collapsed
				deselectable
				selectedValue={getQueryMapArray(this.state.queryMap, "set")}
				onClick={(value, sender) => onClick(value, sender, "set")}
			>
				{this.buildFilterItems("set", this.state.filterCounts && this.state.filterCounts.set)}
				{this.buildFormatFilter(this.state.filterCounts && this.state.filterCounts.format["standard"])}
			</InfoboxFilterGroup>,
			<InfoboxFilterGroup
				key="types"
				header="Type"
				collapsed
				deselectable
				selectedValue={getQueryMapArray(this.state.queryMap, "type")}
				onClick={(value, sender) => onClick(value, sender, "type")}
			>
				{this.buildFilterItems("type", this.state.filterCounts && this.state.filterCounts.type)}
			</InfoboxFilterGroup>,
			<InfoboxFilterGroup
				key="races"
				header="Race"
				collapsed
				deselectable
				selectedValue={getQueryMapArray(this.state.queryMap, "race")}
				onClick={(value, sender) => onClick(value, sender, "race")}
			>
				{this.buildFilterItems("race", this.state.filterCounts && this.state.filterCounts.race)}
			</InfoboxFilterGroup>,
			<InfoboxFilterGroup
				key="mechanics"
				header="Mechanics"
				collapsed
				deselectable
				selectedValue={getQueryMapArray(this.state.queryMap, "mechanics")}
				onClick={(value, sender) => onClick(value, sender, "mechanics")}
			>
				{this.buildFilterItems("mechanics", this.state.filterCounts && this.state.filterCounts.mechanics)}
			</InfoboxFilterGroup>,
		);

		return filters;
	}

	onFilterItemClick(key: string, sender: string, value: string): void {
		const values = getQueryMapArray(this.state.queryMap, key);
		const newFilter = value === null ? values.filter((x) => x !== sender) : values.concat(value);
		setQueryMap(this, key, newFilter.join(","));
	}

	buildFilterItems(key: string, counts: any): JSX.Element[] {
		if (!counts) {
			return null;
		}
		const getText = (item: string) => {
			if (key === "set") {
				return setNames[item.toLowerCase()];
			}
			else if (key === "mechanics") {
				return item === "ENRAGED" ? "Enrage" : item.split("_").map((x) => toTitleCase(x)).join(" ");
			}
			else {
				return toTitleCase(item);
			}
		};

		return this.filters[key].map((item) => (
			<InfoboxFilter value={item} disabled={!counts[item]}>
				{getText("" + item)}
				<span className="infobox-value">{counts[item] || 0}</span>
			</InfoboxFilter>
		));
	}

	buildCostFilters(counts: any): JSX.Element[] {
		return counts && this.filters["cost"].map((item) => (
			<InfoboxFilter value={"" + item} disabled={!counts["" + item]} classNames={["mana-crystal"]}>
				<img src={STATIC_URL + "images/mana_crystal.png"} height={28}/>
				<div>{+item < 7 ? item : " 7+"}</div>
			</InfoboxFilter>
		));
	}

	buildFormatFilter(count: number) {
		const selected = this.state.queryMap["format"] === "standard";
		const classNames = ["selectable"];
		if (!count) {
			classNames.push("disabled");
		}
		if (selected) {
			classNames.push("selected");
		}

		return(
			<li
				className={classNames.join(" ")}
				onClick={() => count && setQueryMap(this, "format", selected ? null : "standard")}
			>
				Standard only
				<span className="infobox-value">{count || 0}</span>
			</li>
		);
	}

	filter(card: any, excludeFilter?: string, sparseDicts?: any[]): boolean {
		const queryMap = this.state.queryMap;
		if (queryMap["text"]) {
			const text = cleanText(queryMap["text"]);
			if (cleanText(card.name).indexOf(text) === -1) {
				if (!card.text || cleanText(card.text).indexOf(text) === -1) {
					return true;
				}
			}
		}

		const viewType = this.props.viewType;

		if (viewType === "statistics") {
			const exclude = this.state.queryMap["exclude"];
			if (exclude === "neutral" && card.playerClass === "NEUTRAL") {
				return true;
			}
			else if (exclude === "class" && card.playerClass !== "NEUTRAL") {
				return true;
			}
			const playerClass = this.state.queryMap["playerClass"];
			if (
				playerClass !== "ALL" && card.multiClassGroup
				&& this.multiClassGroups[card.multiClassGroup].indexOf(playerClass) === -1
			) {
				return true;
			}
			if (this.state.queryMap["gameType"] === "RANKED_STANDARD" && wildSets.indexOf(card.set) !== -1) {
				return true;
			}
			if (playerClass !== "ALL" && playerClass !== card.playerClass && card.playerClass !== "NEUTRAL") {
				return true;
			}
		}

		if (viewType === "personal" && sparseDicts.length) {
			const playedOrIncluded = sparseDicts[0][card.dbfId];
			if (!playedOrIncluded) {
				return true;
			}
		}

		if (viewType === "statistics" && sparseDicts.length) {
			const included = sparseDicts[0][card.dbfId];
			const played = sparseDicts[1][card.dbfId];
			if (!included || !played || +included < 0.01 || +played < 0.01) {
				return true;
			}
		}

		let filter = false;

		Object.keys(this.filters).forEach((key) => {
			if (viewType === "statistics" && key === "playerClass") {
				return;
			}
			if (key === excludeFilter) {
				return;
			}
			const values = getQueryMapArray(queryMap, key);
			if (!values.length) {
				return;
			}

			const available = this.filters[key].filter((x) => values.indexOf("" + x) !== -1);
			if (!filter && available.length) {
				const cardValue = card[key];
				if (key === "format") {
					if (values.indexOf("standard") !== -1) {
						filter = wildSets.indexOf(card.set) !== -1;
					}
				}
				else if (cardValue === undefined) {
					filter = true;
				}
				else if (key === "mechanics") {
					filter = available.every((val) => cardValue.indexOf(val) === -1);
				}
				else if (key === "cost") {
					filter = available.indexOf(Math.min(cardValue, 7)) === -1;
				}
				else {
					filter = available.indexOf(cardValue) === -1;
				}
			}
		});
		return filter;
	}

	getQueryParams(): string {
		const params = {
			GameType: this.state.queryMap["gameType"] || this.defaultQueryMap["gameType"],
			RankRange: this.state.queryMap["rankRange"] || this.defaultQueryMap["rankRange"],
			TimeRange: this.state.queryMap["timeRange"] || this.defaultQueryMap["timeRange"],
			// Region: this.state.queryMap["region"],
		};
		return toQueryString(params);
	}

	fetchIncluded() {
		const cacheKey = genCacheKey(this);
		this.queryManager.fetch(
			"/analytics/query/card_included_popularity_report?" + this.getQueryParams(),
			(data) => {
				const topCardsIncluded = Object.assign({}, this.state.topCardsIncluded);
				topCardsIncluded[cacheKey] = data;
				this.setState({topCardsIncluded});
			},
		);
	}

	fetchPlayed() {
		const cacheKey = genCacheKey(this);
		this.queryManager.fetch(
			"/analytics/query/card_played_popularity_report?" + this.getQueryParams(),
			(data) => {
				const topCardsPlayed = Object.assign({}, this.state.topCardsPlayed);
				topCardsPlayed[cacheKey] = data;
				this.setState({topCardsPlayed});
			},
		);
	}

	fetchPersonal() {
		this.queryManager.fetch(
			"/analytics/query/single_account_lo_individual_card_stats",
			(data) => this.setState({personalCardData: data}),
		);
	}

}
