import * as React from "react";
import CardDetailBarChart from "../components/charts/CardDetailBarChart";
import CardDetailPieChart from "../components/charts/CardDetailPieChart";
import CardImage from "../components/CardImage";
import CardTile from "../components/CardTile";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import QueryManager from "../QueryManager";
import PremiumWrapper from "../components/PremiumWrapper";
import ResetHeader from "../components/ResetHeader";
import SortableTable, {SortDirection} from "../components/SortableTable";
import {ChartSeries, TableQueryData, TableData} from "../interfaces";
import {cardSorting, cleanText, setNames, toTitleCase, toPrettyNumber, wildSets, winrateData} from "../helpers";
import {
	genCacheKey, parseQuery, getQueryMapDiff, getQueryMapArray, getQueryMapFromLocation, 
	setLocationQueryString, toQueryString, queryMapHasChanges, QueryMap, setQueryMap
} from "../QueryParser"

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

interface CardDiscoverState {
	cards?: any[];
	filteredCards: any[];
	filterCounts: CardFilters;
	numCards?: number;
	queryMap?: QueryMap;
	showFilters?: boolean;
	topCardsIncluded?: CardTableData;
	topCardsPlayed?: CardTableData;
}

interface CardDiscoverProps extends React.ClassAttributes<CardDiscover> {
	cardData: Map<string, any>;
	userIsPremium: boolean;
}

export default class CardDiscover extends React.Component<CardDiscoverProps, CardDiscoverState> {
	private readonly queryManager: QueryManager = new QueryManager();
	readonly filters = {
		cost: [0, 1, 2, 3, 4, 5, 6, 7],
		format: ["standard"],
		mechanics: [
			"ENRAGED", "DEATHRATTLE", "TAUNT", "BATTLECRY", "CHARGE", "DIVINE_SHIELD", "WINDFURY",
			"CHOOSE_ONE", "INSPIRE", "JADE_GOLEM", "COMBO", "FREEZE", "STEALTH", "OVERLOAD",
			"POISONOUS", "DISCOVER"
		],
		type: ["MINION", "SPELL", "WEAPON"],
		set: ["CORE", "EXPERT1", "GANGS", "KARA", "OG", "LOE", "TGT", "BRM", "GVG", "NAXX", "PROMO", "REWARD"],
		rarity: ["FREE", "COMMON", "RARE", "EPIC", "LEGENDARY"],
		race: ["BEAST", "DEMON", "DRAGON", "ELEMENTAL", "MECHANICAL", "MURLOC", "PIRATE", "TOTEM"],
		playerClass: ["DRUID", "HUNTER", "MAGE", "PALADIN", "PRIEST", "ROGUE", "SHAMAN", "WARLOCK", "WARRIOR", "NEUTRAL"],
	};
	readonly multiClassGroups = {
		GRIMY_GOONS: ["HUNTER", "PALADIN", "WARRIOR"],
		KABAL: ["MAGE", "PRIEST", "WARLOCK"],
		JADE_LOTUS: ["DRUID", "ROGUE", "SHAMAN"],
	};
	readonly placeholderUrl = STATIC_URL + "images/cardback_placeholder_kabal.png";
	readonly defaultQueryMap: QueryMap = {
		cost: "",
		format: "",
		gameType: "RANKED_STANDARD",
		mechanics: "",
		playerClass: "ALL",
		race: "",
		rankRange: "ALL",
		rarity: "",
		set: "",
		sortBy: "includedPopularity",
		sortDirection: "descending",
		text: "",
		timeRange: "LAST_14_DAYS",
		type: "",
		viewType: "advanced",
	}

	private readonly allowedValues = {
		gameType: ["RANKED_STANDARD", "RANKED_WILD", "ARENA"],
		rankRange: [],
		region: [],
		timeRange: ["LAST_14_DAYS"],
	}

	private readonly allowedValuesPremium = {
		gameType: ["RANKED_STANDARD", "RANKED_WILD", "ARENA"],
		rankRange: ["LEGEND_THROUGH_TEN"],
		region: [],
		timeRange: ["LAST_1_DAY", "LAST_3_DAYS", "LAST_7_DAYS", "LAST_14_DAYS"],
	}

	constructor(props: CardDiscoverProps, state: CardDiscoverState) {
		super(props, state);
		this.state = {
			cards: null,
			filteredCards: null,
			filterCounts: null,
			queryMap: getQueryMapFromLocation(this.defaultQueryMap, this.getAllowedValues()),
			numCards: 24,
			showFilters: false,
			topCardsIncluded: {},
			topCardsPlayed: {},
		}
		this.fetchPlaceholderImage();
		this.filters.mechanics.sort();
		this.fetchIncluded();
		this.fetchPlayed();
	}

	getAllowedValues(): any {
		return this.props.userIsPremium ? this.allowedValuesPremium : this.allowedValues;
	}

	fetchPlaceholderImage() {
		const image = new Image();
		image.src = this.placeholderUrl;
	}

	onSearchScroll(): void {
		if (document.body.scrollTop + (window.innerHeight + 100) >= document.body.scrollHeight) {
			if (this.state.filteredCards.length > this.state.numCards) {
				this.setState({numCards: this.state.numCards + 10});
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
		const cacheKey = this.state.queryMap["viewType"]=== "advanced" && genCacheKey(this);
		const prevCacheKey = prevState.queryMap["viewType"] === "advanced" && genCacheKey(this, prevState);
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
		setLocationQueryString(this.state.queryMap, this.defaultQueryMap);

		if (!this.state.filteredCards || prevState.queryMap !== this.state.queryMap) {
			this.updateFilteredCards();
		}
	}

	updateFilteredCards(): void {
		const filteredByProp = {};
		const filterKeys = Object.keys(this.filters);
		filterKeys.forEach(key => filteredByProp[key] = []);
		const filteredCards = [];
		if (this.state.cards) {
			this.state.cards.forEach(card => {
				filterKeys.forEach(x => {
					if (!this.filter(card, x)) {
						filteredByProp[x].push(card);
					}
				});
				if (!this.filter(card)) {
					filteredCards.push(card);
				}
			});
		}
		this.setState({filteredCards, filterCounts: this.filterCounts(filteredByProp as CardFilters)})
	}

	componentWillReceiveProps(nextProps: CardDiscoverProps) {
		if (!this.state.cards && nextProps.cardData) {
			const cards = [];
			nextProps.cardData.forEach((card, id) => {
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
		const viewType = this.state.queryMap["viewType"];

		let content = null;
		if ((viewType === "advanced" && (!played || !included || played === "loading" || included === "loading")) || !this.props.cardData) {
			content = [
				<div className="content-message">
					<h2>Loading...</h2>
				</div>
			];
		}
		else if (viewType === "advanced" && (played === "error" || included === "error")) {
			content = [
				<div className="content-message">
					<h2>Something went wrong</h2>
					Please check back later.
				</div>
			];
		}
		else if(this.state.filteredCards && !this.state.filteredCards.length) {
			content = (
				<div className="content-message">
					<h2>No cards found</h2>
					<button className="btn btn-default" type="button" onClick={() => this.resetFilters()}>Reset filters</button>
				</div>
			);
		}
		else if (this.state.filteredCards) {
			if (viewType === "advanced") {
				content = [
					<div className="table-wrapper">
						{this.buildCardTable(included as TableQueryData, played as TableQueryData)}
					</div>
				];
			}
			else {
				const tiles = [];
				this.state.filteredCards.forEach(card => {
					if (tiles.length < this.state.numCards) {
						tiles.push(
							<CardImage
								cardId={card.id}
								dbfId={card.dbfId}
								placeholder={this.placeholderUrl}
								key={card.id}
							/>
						);
					}
				})
				content = [
					<div id="card-list">
						{tiles}
					</div>
				];
			}
		}

		let search = null;

		const filterClassNames = ["infobox full-xs"];
		const contentClassNames = ["card-list-wrapper"]
		if (!this.state.showFilters) {
			filterClassNames.push("hidden-xs");
			let clear = null;
			if (this.state.queryMap["text"]) {
				clear = <span className="glyphicon glyphicon-remove form-control-feedback" onClick={() => setQueryMap(this, "text", "")} />;
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
			<button className="btn btn-primary btn-full visible-xs" type="button" onClick={() => this.setState({showFilters: false})}>
				Back to card list
			</button>
		);

		const onAdvancedViewClick = () => {
			const newMap = Object.assign({}, this.state.queryMap);
			newMap["viewType"] = "advanced";
			if (newMap["playerClass"] === "NEUTRAL") {
				newMap["playerClass"] = "ALL";
			}
			this.setState({queryMap: newMap});
		};

		return (
			<div className="card-discover">
				<aside className={filterClassNames.join(" ")} id="card-discover-infobox">
					{backButton}
					{this.buildFilters()}
					{backButton}
				</aside>
				<main className={contentClassNames.join(" ")}>
					<div className="btn-group pull-right">
						<button type="button" className={"btn btn-" + (this.state.queryMap["viewType"] === "advanced" ? "primary" : "default")} onClick={onAdvancedViewClick}>
							Advanced view
						</button>
						<button type="button" className={"btn btn-" + (this.state.queryMap["viewType"] === "simple" ? "primary" : "default")} onClick={() => setQueryMap(this, "viewType", "simple")}>
							Simple view
						</button>
					</div>
					<button className="btn btn-default visible-xs" id="filter-button" type="button" onClick={() => this.setState({showFilters: !this.state.showFilters})}>
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

		this.state.filteredCards && this.state.filteredCards.forEach(card => {
			const included = includedData.series.data[selectedClass === "NEUTRAL" ? "ALL" : selectedClass].find(x => x.dbf_id === card.dbfId);
			const played = playedData.series.data[selectedClass === "NEUTRAL" ? "ALL" : selectedClass].find(x => x.dbf_id === card.dbfId);
			const includedCount = included && +included.count;
			const includedDecks = included && +included.decks;
			const includedPopularity = included && +included.popularity;
			const includedWinrate = included && +included.win_rate;
			const playedPopularity = played && +played.popularity;
			const playedWinrate = played && +played.win_rate;
			const playedCount = played && +played.total;
			cardObjs.push({
				card, includedCount, includedDecks, includedPopularity, includedWinrate,
				playedPopularity, playedWinrate, playedCount
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

		const sortIndicator = (name: string): JSX.Element => {
			return (
				<span className={name === sortBy ? "" : "no-sort"}>
					{sortDirection === "ascending" ? "▴" : "▾"}
				</span>
			);
		};

		const onSortChanged = (sortBy: string, sortDirection: SortDirection): void => {
			const queryMap = Object.assign({}, this.state.queryMap);
			queryMap.sortBy = sortBy;
			queryMap.sortDirection = sortDirection;
			this.setState({queryMap});
		};

		const toDynamicFixed = (value: number) => {
			const digits = Math.min(Math.max(0, Math.floor(Math.log10(1 / value))), 6) + 1;
			return value.toFixed(digits);
		}

		cardObjs.slice(0, this.state.numCards).forEach(obj => {
			const playedPopularity = " (" + (obj.playedPopularity ? toDynamicFixed(obj.playedPopularity) + "%" : "0%") + ")";
			const includedWrData = obj.includedWinrate && winrateData(50, obj.includedWinrate, 3);
			const playedWrData = obj.playedWinrate && winrateData(50, obj.playedWinrate, 3);
			rows.push(
				<tr>
					<td>
						<div className="card-wrapper">
							<a href={"/cards/" + obj.card.dbfId}>
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
						{(obj.playedCount ? toPrettyNumber(obj.playedCount) : "0") + playedPopularity}
					</td>
					<td style={{color: playedWrData && playedWrData.color}}>
						{obj.playedWinrate ? toDynamicFixed(obj.playedWinrate) + "%" : "-"}
					</td>
				</tr>
			);
		});

		const tableHeaders = [
			{key: "card", text: "Card", defaultSortDirection: "ascending" as SortDirection},
			{key: "includedPopularity", text: "In % of decks", infoHeader: "Included in % of decks", infoText: "Percentage of decks that include at least one copy of the card."},
			{key: "includedCount", text: "Copies", infoHeader: "Copies in deck", infoText: "Average number of copies in a deck."},
			{key: "includedWinrate", text: "Deck winrate", infoHeader: "Deck Winrate", infoText: "Average winrate of decks that include this card."},
			{key: "playedCount", text: "Times played", infoHeader: "Times played", infoText: "Number of times the card was played."},
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
			playerClass: {},
			cost: {},
			rarity: {},
			set: {},
			type: {},
			race: {},
			mechanics: {},
			format: {}
		};

		Object.keys(filters).forEach(key => {
			cardFilters[key].forEach(card => {
				if (key === "mechanics") {
					card.mechanics && card.mechanics.forEach(m => {
						filters.mechanics[m] = (filters.mechanics[m] || 0) + 1;
					})
				}
				else if (key === "format") {
					if (wildSets.indexOf(card.set) === -1){
						filters.format["standard"] = (filters.format["standard"] || 0) + 1;
					}
				}
				else if (key === "cost") {
					if (card.cost != undefined) {
						const cost = ''+Math.min(card.cost, 7);
						filters.cost[cost] = (filters.cost[cost] || 0) + 1;
					}
				}
				else {
					const prop = card[key];
					if (prop != undefined) {
						filters[key][""+prop] = (filters[key][""+prop] || 0) + 1;
					}
				}
			})
		});

		return filters;
	}

	getDefeaultQueryMap(): QueryMap {
		const queryMap = Object.assign({}, this.defaultQueryMap);
		queryMap.viewType = this.state.queryMap.viewType;
		queryMap.sortBy = this.state.queryMap.sortBy;
		queryMap.sortDirection = this.state.queryMap.sortDirection;
		return queryMap;
	}

	resetFilters(): void {
		this.setState({queryMap: this.getDefeaultQueryMap()});
	}

	buildFilters(): JSX.Element[] {
		let showReset = queryMapHasChanges(this.state.queryMap, this.getDefeaultQueryMap());

		const filters = [
			<ResetHeader onReset={() => this.resetFilters()} showReset={showReset}>
				Card Database
			</ResetHeader>
		];

		if (this.state.queryMap["viewType"] === "simple") {
			filters.push(
				<h2>Card class</h2>,
				<ClassFilter 
					filters="AllNeutral"
					hideAll
					minimal
					multiSelect={false}
					selectedClasses={[this.state.queryMap["playerClass"] as FilterOption]}
					selectionChanged={(selected) => setQueryMap(this, "playerClass", selected[0])}
				/>
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
				<InfoboxFilterGroup deselectable selectedValue={this.state.queryMap["exclude"]} onClick={(value) => setQueryMap(this, "exclude", value)}>
					<InfoboxFilter value="neutral">Class cards only</InfoboxFilter>
					<InfoboxFilter value="class">Neutral cards only</InfoboxFilter>
				</InfoboxFilterGroup>,
				<section id="mode-filter">
					<InfoboxFilterGroup header="Mode" selectedValue={this.state.queryMap["gameType"]} onClick={(value) => setQueryMap(this, "gameType", value)}>
						<InfoboxFilter value="RANKED_STANDARD">Ranked Standard</InfoboxFilter>
						<InfoboxFilter value="RANKED_WILD">Ranked Wild</InfoboxFilter>
						<InfoboxFilter disabled={this.state.queryMap["rankRange"] === "LEGEND_THROUGH_TEN"} value="ARENA">Arena</InfoboxFilter>
					</InfoboxFilterGroup>
				</section>,
				<PremiumWrapper
					isPremium={this.props.userIsPremium}
					infoHeader="Time frame"
					infoContent="Get the most recent data on what cards are hot right now!"
				>
					<InfoboxFilterGroup header="Time frame" locked={!this.props.userIsPremium} selectedValue={this.state.queryMap["timeRange"]} onClick={(value) => setQueryMap(this, "timeRange", value)}>
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
					<InfoboxFilterGroup header="Rank range" locked={!this.props.userIsPremium} selectedValue={this.state.queryMap["rankRange"]} onClick={(value) => setQueryMap(this, "rankRange", value)}>
						<InfoboxFilter disabled={this.state.queryMap["gameType"] === "ARENA"} value="LEGEND_THROUGH_TEN">Legend–10</InfoboxFilter>
						<InfoboxFilter disabled={this.state.queryMap["gameType"] === "ARENA"} value="ALL">Legend–25</InfoboxFilter>
					</InfoboxFilterGroup>
				</PremiumWrapper>
			);
		}

		filters.push(
			<InfoboxFilterGroup key="costs" header="Cost" deselectable classNames={["filter-list-cost"]} selectedValue={getQueryMapArray(this.state.queryMap, "cost")} onClick={(value, sender) => this.state.filterCounts && this.state.filterCounts.cost && this.onFilterItemClick("cost", sender, value)}>
				{this.buildCostFilters(this.state.filterCounts && this.state.filterCounts.cost)}
			</InfoboxFilterGroup>,
			<InfoboxFilterGroup key="rarities" header="Rarity" deselectable selectedValue={getQueryMapArray(this.state.queryMap, "rarity")} onClick={(value, sender) => this.state.filterCounts && this.state.filterCounts.rarity && this.onFilterItemClick("rarity", sender, value)}>
				{this.buildFilterItems("rarity", this.state.filterCounts && this.state.filterCounts.rarity)}
			</InfoboxFilterGroup>,
			<InfoboxFilterGroup key="sets" header="Set" collapsed deselectable selectedValue={getQueryMapArray(this.state.queryMap, "set")} onClick={(value, sender) => this.state.filterCounts && this.state.filterCounts.set && this.onFilterItemClick("set", sender, value)}>
				{this.buildFilterItems("set", this.state.filterCounts && this.state.filterCounts.set)}
				{this.buildFormatFilter(this.state.filterCounts && this.state.filterCounts.format["standard"])}
			</InfoboxFilterGroup>,
			<InfoboxFilterGroup key="types" header="Type" collapsed deselectable selectedValue={getQueryMapArray(this.state.queryMap, "type")} onClick={(value, sender) => this.state.filterCounts && this.state.filterCounts.type && this.onFilterItemClick("type", sender, value)}>
				{this.buildFilterItems("type", this.state.filterCounts && this.state.filterCounts.type)}
			</InfoboxFilterGroup>,
			<InfoboxFilterGroup key="races" header="Race" collapsed deselectable selectedValue={getQueryMapArray(this.state.queryMap, "race")} onClick={(value, sender) => this.state.filterCounts && this.state.filterCounts.race && this.onFilterItemClick("race", sender, value)}>
				{this.buildFilterItems("race", this.state.filterCounts && this.state.filterCounts.race)}
			</InfoboxFilterGroup>,
			<InfoboxFilterGroup key="mechanics" header="Mechanics" collapsed deselectable selectedValue={getQueryMapArray(this.state.queryMap, "mechanics")} onClick={(value, sender) => this.state.filterCounts && this.state.filterCounts.mechanics && this.onFilterItemClick("mechanics", sender, value)}>
				{this.buildFilterItems("mechanics", this.state.filterCounts && this.state.filterCounts.mechanics)}
			</InfoboxFilterGroup>,
		);

		return filters;
	}

	onFilterItemClick(key: string, sender: string, value: string): void {
		const values = getQueryMapArray(this.state.queryMap, key);
		const newFilter = value === null ? values.filter(x => x !== sender) : values.concat(value);
		setQueryMap(this, key, newFilter.join(","))
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
				return item === "ENRAGED" ? "Enrage" : item.split("_").map(x => toTitleCase(x)).join(" ");
			}
			else {
				return toTitleCase(item);
			}
		}

		return this.filters[key].map(item => (
			<InfoboxFilter value={item} disabled={!counts[item]}>
				{getText(""+item)}
				<span className="infobox-value">{counts[item] || 0}</span>
			</InfoboxFilter>
		));
	}

	buildCostFilters(counts: any): JSX.Element[] {
		return counts && this.filters["cost"].map(item => (
			<InfoboxFilter value={""+item} disabled={!counts[""+item]} classNames={["mana-crystal"]}>
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
			<li className={classNames.join(" ")} onClick={() => count && setQueryMap(this, "format", selected ? null : "standard")}>
				Standard only
				<span className="infobox-value">{count || 0}</span>
			</li>
		);
	}

	filter(card: any, excludeFilter?: string): boolean {
		const queryMap = this.state.queryMap;
		if (queryMap["text"]) {
			const text = cleanText(queryMap["text"]);
			if (cleanText(card.name).indexOf(text) === -1) {
				if (!card.text || cleanText(card.text).indexOf(text) === -1) {
					return true;
				}
			}
		}

		const viewType = this.state.queryMap["viewType"];

		if (viewType === "advanced") {
			const exclude = this.state.queryMap["exclude"];
			if (exclude === "neutral" && card.playerClass === "NEUTRAL") {
				return true;
			}
			else if (exclude === "class" && card.playerClass !== "NEUTRAL") {
				return true;
			}
			if (card.multiClassGroup && this.multiClassGroups[card.multiClassGroup].indexOf(card.playerClass) === -1) {
				return true;
			}
			if (this.state.queryMap["gameType"] === "RANKED_STANDARD" && wildSets.indexOf(card.set) !== -1) {
				return true;
			}
			const playerClass = this.state.queryMap["playerClass"];
			if (playerClass !== "ALL" && playerClass !== card.playerClass && card.playerClass !== "NEUTRAL") {
				return true;
			}
		}

		let filter = false;
		Object.keys(this.filters).forEach(key => {
			if (viewType === "advanced" && key === "playerClass") {
				return;
			}
			if (key === excludeFilter) {
				return;
			}
			const values = getQueryMapArray(queryMap, key);
			if (!values.length) {
				return;
			}

			const available = this.filters[key].filter(x => values.indexOf(''+x) !== -1);
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
					filter = available.every(val => cardValue.indexOf(val) === -1);
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
			TimeRange: this.state.queryMap["timeRange"] || this.defaultQueryMap["timeRange"],
			RankRange: this.state.queryMap["rankRange"] || this.defaultQueryMap["rankRange"],
			GameType: this.state.queryMap["gameType"] || this.defaultQueryMap["gameType"],
			// Region: this.state.queryMap["region"],
		};
		return toQueryString(params);
	}

	fetchIncluded() {
		if (this.state.queryMap["viewType"] === "simple") {
			return;
		}
		const cacheKey = genCacheKey(this);
		this.queryManager.fetch(
			"/analytics/query/card_included_popularity_report?" + this.getQueryParams(),
			(data) => {
				const topCardsIncluded = Object.assign({}, this.state.topCardsIncluded);
				topCardsIncluded[cacheKey] = data;
				this.setState({topCardsIncluded});
			}
		);
	}

	fetchPlayed() {
		if (this.state.queryMap["viewType"] === "simple") {
			return;
		}
		const cacheKey = genCacheKey(this);
		this.queryManager.fetch(
			"/analytics/query/card_played_popularity_report?" + this.getQueryParams(),
			(data) => {
				const topCardsPlayed = Object.assign({}, this.state.topCardsPlayed);
				topCardsPlayed[cacheKey] = data;
				this.setState({topCardsPlayed});
			}
		);
	}

}
