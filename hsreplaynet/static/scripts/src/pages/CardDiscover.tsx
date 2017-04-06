import * as React from "react";
import * as _ from "lodash";
import CardData from "../CardData";
import CardStatsTable from "../components/carddiscover/CardStatsTable";
import CardImage from "../components/CardImage";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import DataInjector from "../components/DataInjector";
import MyCardStatsTable from "../components/deckdetail/MyCardStatsTable";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import TableLoading from "../components/loading/TableLoading";
import PremiumWrapper from "../components/PremiumWrapper";
import ResetHeader from "../components/ResetHeader";
import {SortDirection} from "../components/SortableTable";
import DataManager from "../DataManager";
import {cardSorting, cleanText, setNames, toTitleCase, slangToCardId, isWildSet} from "../helpers";
import InfoboxLastUpdated from "../components/InfoboxLastUpdated";
import UserData, {Account} from "../UserData";
import {FragmentChildProps, LoadingStatus} from "../interfaces";

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

export const enum ViewType {
	CARDS,
	STATISTICS,
	PERSONAL,
};

interface CardDiscoverState {
	cards?: any[];
	filteredCards?: any[];
	filterCounts?: CardFilters;
	hasPersonalData?: boolean;
	hasStatisticsData?: boolean;
	numCards?: number;
	showFilters?: boolean;
}

interface CardDiscoverProps extends FragmentChildProps, React.ClassAttributes<CardDiscover> {
	cardData: CardData;
	user: UserData;
	viewType: ViewType;
	accounts?: Account[];

	text?: string;
	setText?: (text: string, debounce?: boolean) => void;
	account?: string;
	setAccount?: (account: string) => void;
	showSparse?: boolean;
	setShowSparse?: (showSparse: boolean) => void;
	format?: string;
	setFormat?: (format: string) => void;
	gameType?: string;
	setGameType?: (gameType: string) => void;
	playerClass?: string;
	setPlayerClass?: (playerClass: string) => void;
	rankRange?: string;
	setRankRange?: (rankRange: string) => void;
	timeRange?: string;
	setTimeRange?: (timeRange: string) => void;
	exclude?: string;
	setExclude?: (exclude: string) => void;

	cost?: string[];
	setCost?: (cost: string[]) => void;
	toggleCost?: (cost: string) => void;
	rarity?: string[];
	setRarity?: (rarity: string[]) => void;
	toggleRarity?: (rarity: string) => void;
	set?: string[];
	setSet?: (set: string[]) => void;
	toggleSet?: (set: string) => void;
	type?: string[];
	setType?: (type: string[]) => void;
	toggleType?: (type: string) => void;
	race?: string[];
	setRace?: (race: string[]) => void;
	toggleRace?: (race: string) => void;
	mechanics?: string[];
	setMechanics?: (mechanics: string[]) => void;
	toggleMechanics?: (mechanic: string) => void;

	sortBy?: string;
	setSortBy?: (sortBy: string) => void;
	sortDirection?: SortDirection;
	setSortDirection?: (sortDirection: SortDirection) => void;
}

const PLACEHOLDER_MINION = STATIC_URL + "images/loading_minion.png";
const PLACEHOLDER_SPELL = STATIC_URL + "images/loading_spell.png";
const PLACEHOLDER_WEAPON = STATIC_URL + "images/loading_weapon.png";

export default class CardDiscover extends React.Component<CardDiscoverProps, CardDiscoverState> {
	private readonly dataManager: DataManager = new DataManager();
	readonly filters = {
		cost: [0, 1, 2, 3, 4, 5, 6, 7],
		format: ["standard"],
		mechanics: [
			"ENRAGED", "DEATHRATTLE", "TAUNT", "BATTLECRY", "CHARGE", "DIVINE_SHIELD", "WINDFURY",
			"CHOOSE_ONE", "INSPIRE", "JADE_GOLEM", "COMBO", "FREEZE", "STEALTH", "OVERLOAD",
			"POISONOUS", "DISCOVER", "SILENCE", "RITUAL", "ADAPT", "QUEST",
		],
		playerClass: ["DRUID", "HUNTER", "MAGE", "PALADIN", "PRIEST", "ROGUE", "SHAMAN", "WARLOCK", "WARRIOR", "NEUTRAL"],
		race: ["BEAST", "DEMON", "DRAGON", "ELEMENTAL", "MECHANICAL", "MURLOC", "PIRATE", "TOTEM"],
		rarity: ["FREE", "COMMON", "RARE", "EPIC", "LEGENDARY"],
		set: ["CORE", "EXPERT1", "UNGORO", "GANGS", "KARA", "OG", "LOE", "TGT", "BRM", "GVG", "NAXX", "HOF"],
		type: ["MINION", "SPELL", "WEAPON"],
	};
	readonly multiClassGroups = {
		GRIMY_GOONS: ["HUNTER", "PALADIN", "WARRIOR"],
		JADE_LOTUS: ["DRUID", "ROGUE", "SHAMAN"],
		KABAL: ["MAGE", "PRIEST", "WARLOCK"],
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
			filteredCards: [],
			hasPersonalData: false,
			hasStatisticsData: false,
			numCards: 24,
			showFilters: false,
		};
		switch (this.props.viewType) {
			case ViewType.CARDS:
				const minion = new Image();
				minion.src = PLACEHOLDER_MINION;
				const spell = new Image();
				spell.src = PLACEHOLDER_SPELL;
				const weapon = new Image();
				weapon.src = PLACEHOLDER_WEAPON;
				break;
		}
		this.filters.mechanics.sort();

		if (this.props.viewType === ViewType.PERSONAL) {
			this.dataManager.get("single_account_lo_individual_card_stats", this.getPersonalParams())
				.then((data) => this.setState({hasPersonalData: data && data.series.data.ALL.length > 0}));
		}
		else if (this.props.viewType === ViewType.STATISTICS) {
			let played = false;
			let included = false;
			const updateHasData = () => played && included && this.setState({hasStatisticsData: true});
			this.dataManager.get("card_played_popularity_report", this.getParams())
				.then((data) => {
					played = true;
					updateHasData();
				});
			this.dataManager.get("card_included_popularity_report", this.getParams())
				.then((data) => {
					included = true;
					updateHasData();
				});
		}
	}

	getAllowedValues(): any {
		return this.props.user.isPremium() ? this.allowedValuesPremium : this.allowedValues;
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
		if (!_.isEqual(this.props, prevProps)) {
			this.updateFilteredCards();
		}

		if (!this.state.filteredCards || !_.eq(prevState.cards, this.state.cards)) {
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

		(!this.props.showSparse ? this.getSparseFilterDicts() : Promise.resolve([]))
			.then((sparseDict) => {
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
			});
	}

	getSparseFilterDicts(): Promise<any> {
		// build dictionaries from the tabledata to optimize lookup time when filtering
		if (this.props.viewType === ViewType.STATISTICS) {
			const params = this.getParams();
			const promises = [
				this.dataManager.get("card_played_popularity_report", params),
				this.dataManager.get("card_included_popularity_report", params),
			];
			return Promise.all(promises)
				.then((data: any[]) => {
					const sparseDict = [];
					sparseDict[0] = {};
					const playedData = data[0].series.data[this.props.playerClass];
					playedData.forEach((card) => {
						sparseDict[0][card.dbf_id] = card.popularity;
					});
					sparseDict[1] = {};
					const includedData = data[1].series.data[this.props.playerClass];
					includedData.forEach((card) => {
						sparseDict[1][card.dbf_id] = card.popularity;
					});
					return sparseDict;
				}, (status) => {
					return [];
				});
		}
		else if (this.props.viewType === ViewType.PERSONAL) {
			return this.dataManager
				.get("single_account_lo_individual_card_stats", this.getPersonalParams())
				.then((data) => {
					const sparseDict = {};
					data.series.data.ALL.forEach((card) => {
						sparseDict[card.dbf_id] = card.total_games || card.times_played;
					});
					return [sparseDict];
				}, (status) => {
					return [];
				});
		}
		else {
			return Promise.resolve([]);
		}
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
		const viewType = this.props.viewType;
		const content = [];

		let showMoreButton = null;

		if (this.state.filteredCards.length > this.state.numCards) {
			showMoreButton = (
				<div id="more-button-wrapper">
					<button
						type="button"
						className="btn btn-default"
						onClick={() => this.setState({numCards: this.state.numCards + 20})}
					>
						Show more…
					</button>
				</div>
			);
		}

		if (viewType === ViewType.PERSONAL) {
			content.push(
				<div className="table-wrapper">
					<DataInjector
						dataManager={this.dataManager}
						query={{params: this.getPersonalParams(), url: "single_account_lo_individual_card_stats"}}
					>
						<TableLoading cardData={this.props.cardData}>
							<MyCardStatsTable
								cards={this.state.filteredCards || []}
								numCards={this.state.numCards}
								sortBy={this.props.sortBy}
								sortDirection={this.props.sortDirection}
								onSortChanged={(a, b) => this.onSortChanged(a, b)}
							/>
						</TableLoading>
					</DataInjector>
				</div>,
			);
			if (showMoreButton && this.state.hasPersonalData) {
				content.push(showMoreButton);
			}
		}
		else if (viewType === ViewType.STATISTICS) {
			content.push(
				<div className="table-wrapper">
					<DataInjector
						dataManager={this.dataManager}
						query={[
							{key: "played", url: "card_played_popularity_report", params: this.getParams()},
							{key: "included", url: "card_included_popularity_report", params: this.getParams()},
						]}
					>
						<TableLoading cardData={this.props.cardData} dataKeys={["played", "included"]}>
							<CardStatsTable
								cards={this.state.filteredCards || []}
								numCards={this.state.numCards}
								gameType={this.props.gameType}
								playerClass={this.props.playerClass}
								sortBy={this.props.sortBy}
								sortDirection={this.props.sortDirection}
								onSortChanged={(a, b) => this.onSortChanged(a, b)}
							/>
						</TableLoading>
					</DataInjector>
				</div>,
			);
			if (showMoreButton && this.state.hasStatisticsData) {
				content.push(showMoreButton);
			}
		}
		else {
			const tiles = [];
			if (this.state.cards && this.state.cards.length) {
				this.state.filteredCards.forEach((card) => {
					if (tiles.length < this.state.numCards) {
						tiles.push(
							<CardImage
								card={card}
								placeholder={this.getCardPlaceholder(card)}
								key={card.id}
							/>,
						);
					}
				});
				content.push(
					<div id="card-list">
						{tiles}
					</div>,
				);
				if (showMoreButton) {
					content.push(showMoreButton);
				}
			}
			else {
				content.push(<TableLoading cardData={this.props.cardData} status={LoadingStatus.LOADING} />);
			}
		}

		let search = null;

		const filterClassNames = ["infobox full-xs"];
		const contentClassNames = ["card-list-wrapper"];
		if (!this.state.showFilters) {
			filterClassNames.push("hidden-xs");
			let clear = null;
			if (this.props.text) {
				clear = (
					<span className="glyphicon glyphicon-remove form-control-feedback" onClick={() => this.props.setText("", false)} />
				);
			}
			search = (
				<div className="search-wrapper">
					<div className="form-group has-feedback">
						<input
							autoFocus
							placeholder="Search…"
							type="search"
							className="form-control"
							value={this.props.text}
							onChange={(x) => this.props.setText(x.target["value"])}
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

	getCardPlaceholder(card: any): string {
		switch (card.type) {
			case "WEAPON":
				return PLACEHOLDER_WEAPON;
			case "SPELL":
				return PLACEHOLDER_SPELL;
			default:
				return PLACEHOLDER_MINION;
		}
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
					if (!isWildSet(card.set)){
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

	resetFilters(): void {
		this.props.reset();
	}

	buildFilters(): JSX.Element[] {
		const showReset = this.props.canBeReset;
		const viewType = this.props.viewType;

		const filters = [
			<ResetHeader onReset={() => this.resetFilters()} showReset={showReset}>
				{viewType === ViewType.CARDS ? "Gallery" : (viewType === ViewType.STATISTICS ? "Cards" : "My Cards")}
			</ResetHeader>,
		];

		const modeFilter = (
				<section id="mode-filter">
					<InfoboxFilterGroup
						header="Game Mode"
						selectedValue={this.props.gameType}
						onClick={(value) => this.props.setGameType(value)}
					>
						<InfoboxFilter value="RANKED_STANDARD">Ranked Standard</InfoboxFilter>
						<InfoboxFilter value="RANKED_WILD">Ranked Wild</InfoboxFilter>
						<InfoboxFilter disabled={this.props.rankRange === "LEGEND_THROUGH_TEN"} value="ARENA">
							Arena
						</InfoboxFilter>
					</InfoboxFilterGroup>
				</section>
		);

		if (viewType === ViewType.CARDS || viewType === ViewType.PERSONAL) {
			filters.push(
				<h2>Class</h2>,
				<ClassFilter
					filters="AllNeutral"
					hideAll
					minimal
					selectedClasses={[this.props.playerClass as FilterOption]}
					selectionChanged={(selected) => this.props.setPlayerClass(selected[0])}
				/>,
			);
		}
		else {
			const isPremium = !!this.props.user.isPremium();
			const premiumTabIndex = isPremium ? 0 : -1;
			filters.push(
				<h2>Deck Class</h2>,
				<ClassFilter
					filters="All"
					hideAll
					minimal
					selectedClasses={[this.props.playerClass as FilterOption]}
					selectionChanged={(selected) => this.props.setPlayerClass(selected[0])}
				/>,
				<InfoboxFilterGroup
					deselectable
					selectedValue={this.props.exclude}
					onClick={(value) => this.props.setExclude(value)}
				>
					<InfoboxFilter value="neutral">Class cards only</InfoboxFilter>
					<InfoboxFilter value="class">Neutral cards only</InfoboxFilter>
				</InfoboxFilterGroup>,
				modeFilter,
				<PremiumWrapper
					isPremium={isPremium}
					infoHeader="Time Frame"
					infoContent="Get the most recent data on which cards are hot right now!"
				>
					<InfoboxFilterGroup
						header="Time Frame"
						locked={!isPremium}
						selectedValue={this.props.timeRange}
						onClick={(value) => this.props.setTimeRange(value)}
						tabIndex={premiumTabIndex}
					>
						<InfoboxFilter value="LAST_1_DAY">Yesterday</InfoboxFilter>
						<InfoboxFilter value="LAST_3_DAYS">Last 3 days</InfoboxFilter>
						<InfoboxFilter value="LAST_7_DAYS">Last 7 days</InfoboxFilter>
						<InfoboxFilter value="LAST_14_DAYS">Last 14 days</InfoboxFilter>
					</InfoboxFilterGroup>
				</PremiumWrapper>,
				<PremiumWrapper
					isPremium={isPremium}
					infoHeader="Rank Range"
					infoContent="Check out which cards are played at certain rank ranges on the ranked ladder!"
				>
					<InfoboxFilterGroup
						header="Rank Range"
						locked={!isPremium}
						selectedValue={this.props.rankRange} onClick={(value) => this.props.setRankRange(value)}
						tabIndex={premiumTabIndex}
					>
						<InfoboxFilter disabled={this.props.gameType === "ARENA"} value="LEGEND_THROUGH_TEN">
							Legend–10
						</InfoboxFilter>
						<InfoboxFilter disabled={this.props.gameType === "ARENA"} value="ALL">Legend–25</InfoboxFilter>
					</InfoboxFilterGroup>
				</PremiumWrapper>,
			);
		}

		let timeFrame = null;
		if (viewType === ViewType.PERSONAL) {
			filters.push(modeFilter);
			timeFrame = (
				<li>
					Time frame
					<span className="infobox-value">Last 30 days</span>
				</li>
			);
		}

		if (viewType === ViewType.PERSONAL && this.props.accounts.length > 0) {
			const accounts = [];
			this.props.accounts.forEach((acc) => {
				accounts.push(
					<InfoboxFilter value={acc.region + "-" + acc.lo}>
						{acc.display}
					</InfoboxFilter>,
				);
			});
			if (accounts.length) {
				filters.push(
					<InfoboxFilterGroup
						header="Accounts"
						selectedValue={this.props.account}
						onClick={(value) => this.props.setAccount(value)}
						tabIndex={accounts.length > 1 ? 0 : -1}
					>
						{accounts}
					</InfoboxFilterGroup>,
				);
			}
		}

		if (viewType === ViewType.STATISTICS || viewType === ViewType.PERSONAL) {
			const lastUpdatedUrl = viewType === ViewType.STATISTICS
				? "card_played_popularity_report"
				: "single_account_lo_individual_card_stats";
			const lastUpdatedParams = viewType === ViewType.STATISTICS ? this.getParams() : this.getPersonalParams();
			filters.push(
				<h2>Data</h2>,
				<ul>
					<InfoboxLastUpdated
						dataManager={this.dataManager}
						url={lastUpdatedUrl}
						params={lastUpdatedParams}
					/>
					{timeFrame}
				</ul>,
				<InfoboxFilterGroup
					deselectable
					selectedValue={this.props.showSparse ? "show" : null}
					onClick={(value) => this.props.setShowSparse(value === "show" ? true : false)}
				>
					<InfoboxFilter value="show">Show sparse data</InfoboxFilter>
				</InfoboxFilterGroup>,
			);
		}

		filters.push(
			<InfoboxFilterGroup
				key="costs"
				header="Cost"
				deselectable
				classNames={["filter-list-cost"]}
				selectedValue={this.props.cost}
				onClick={(newValue, cost) => this.props.toggleCost(cost)}
			>
				{this.buildCostFilters(this.state.filterCounts && this.state.filterCounts.cost)}
			</InfoboxFilterGroup>,
			<InfoboxFilterGroup
				key="rarities"
				header="Rarity"
				deselectable
				selectedValue={this.props.rarity}
				onClick={(newValue, rarity) => this.props.toggleRarity(rarity)}
			>
				{this.buildFilterItems("rarity", this.state.filterCounts && this.state.filterCounts.rarity)}
			</InfoboxFilterGroup>,
			<InfoboxFilterGroup
				key="sets"
				header="Set"
				collapsed
				deselectable
				selectedValue={this.props.set}
				onClick={(newValue, set) => this.props.toggleSet(set)}
			>
				{this.buildFilterItems("set", this.state.filterCounts && this.state.filterCounts.set)}
				{this.buildFormatFilter(this.state.filterCounts && this.state.filterCounts.format["standard"])}
			</InfoboxFilterGroup>,
			<InfoboxFilterGroup
				key="types"
				header="Type"
				collapsed
				deselectable
				selectedValue={this.props.type}
				onClick={(newValue, type) => this.props.toggleType(type)}
			>
				{this.buildFilterItems("type", this.state.filterCounts && this.state.filterCounts.type)}
			</InfoboxFilterGroup>,
			<InfoboxFilterGroup
				key="races"
				header="Race"
				collapsed
				deselectable
				selectedValue={this.props.race}
				onClick={(newValue, race) => this.props.toggleRace(race)}
			>
				{this.buildFilterItems("race", this.state.filterCounts && this.state.filterCounts.race)}
			</InfoboxFilterGroup>,
			<InfoboxFilterGroup
				key="mechanics"
				header="Mechanics"
				collapsed
				deselectable
				selectedValue={this.props.mechanics}
				onClick={(newValue, mechanic) => this.props.toggleMechanics(mechanic)}
			>
				{this.buildFilterItems("mechanics", this.state.filterCounts && this.state.filterCounts.mechanics)}
			</InfoboxFilterGroup>,
		);

		return filters;
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
		const selected = this.props.format === "standard";
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
				onClick={() => count && this.props.setFormat(selected ? null : "standard")}
			>
				Standard only
				<span className="infobox-value">{count || 0}</span>
			</li>
		);
	}

	filter(card: any, excludeFilter?: string, sparseDicts?: any[]): boolean {
		if (this.props.text) {
			const text = cleanText(this.props.text);
			const slang = slangToCardId(text);
			if (!slang || card.id !== slang) {
				if (cleanText(card.name).indexOf(text) === -1) {
					if (!card.text || cleanText(card.text).indexOf(text) === -1) {
						return true;
					}
				}
			}
		}

		const viewType = this.props.viewType;

		if (viewType === ViewType.STATISTICS) {
			const exclude = this.props.exclude;
			if (exclude === "neutral" && card.playerClass === "NEUTRAL") {
				return true;
			}
			else if (exclude === "class" && card.playerClass !== "NEUTRAL") {
				return true;
			}
			const playerClass = this.props.playerClass;
			if (
				playerClass !== "ALL" && card.multiClassGroup
				&& this.multiClassGroups[card.multiClassGroup].indexOf(playerClass) === -1
			) {
				return true;
			}
			if (this.props.gameType === "RANKED_STANDARD" && isWildSet(card.set)) {
				return true;
			}
			if (playerClass !== "ALL" && playerClass !== card.playerClass && card.playerClass !== "NEUTRAL") {
				return true;
			}
		}

		if (viewType === ViewType.PERSONAL && sparseDicts.length) {
			const playedOrIncluded = sparseDicts[0][card.dbfId];
			if (!playedOrIncluded) {
				return true;
			}
		}

		if (viewType === ViewType.STATISTICS && sparseDicts.length) {
			const included = sparseDicts[0][card.dbfId];
			const played = sparseDicts[1][card.dbfId];
			if (!included || !played || +included < 0.01 || +played < 0.01) {
				return true;
			}
		}

		let filter = false;

		Object.keys(this.filters).forEach((key) => {
			if (viewType === ViewType.STATISTICS && key === "playerClass") {
				return;
			}
			if (key === excludeFilter) {
				return;
			}
			const values = this.props[key];
			if (!values.length) {
				return;
			}

			const available = this.filters[key].filter((x) => values.indexOf("" + x) !== -1);
			if (!filter && available.length) {
				const cardValue = card[key];
				if (key === "format") {
					if (values.indexOf("standard") !== -1) {
						filter = isWildSet(card.set);
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

	getParams(): any {
		return {
			GameType: this.props.gameType,
			RankRange: this.props.rankRange,
			TimeRange: this.props.timeRange,
			// Region: this.props.region,
		};
	}

	getPersonalParams(): any {
		const getRegion = (account: string) => account && account.split("-")[0];
		const getLo = (account: string) => account && account.split("-")[1];
		return {
			GameType: this.props.gameType,
			Region: getRegion(this.props.account),
			account_lo: getLo(this.props.account),
		};
	}

	onSortChanged(sortBy, sortDirection): void {
		this.props.setSortBy(sortBy);
		this.props.setSortDirection(sortDirection);
	}
}
