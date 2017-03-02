import * as React from "react";
import CardDetailBarChart from "../components/charts/CardDetailBarChart";
import CardDetailPieChart from "../components/charts/CardDetailPieChart";
import CardImage from "../components/CardImage";
import CardTile from "../components/CardTile";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import ResetHeader from "../components/ResetHeader";
import {ChartSeries} from "../interfaces";
import {cardSorting, setNames, toTitleCase, wildSets} from "../helpers";
import {
	parseQuery, getQueryMapDiff, getQueryMapArray, getQueryMapFromLocation, 
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

interface CardDiscoverState {
	cards?: any[];
	numCards?: number;
	queryMap?: QueryMap;
	showFilters?: boolean;
}

interface CardDiscoverProps extends React.ClassAttributes<CardDiscover> {
	cardData: Map<string, any>;
}

export default class CardDiscover extends React.Component<CardDiscoverProps, CardDiscoverState> {
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
		race: ["BEAST", "DEMON", "DRAGON", "MECHANICAL", "MURLOC", "PIRATE", "TOTEM"],
		playerClass: ["DRUID", "HUNTER", "MAGE", "PALADIN", "PRIEST", "ROGUE", "SHAMAN", "WARLOCK", "WARRIOR", "NEUTRAL"],
	};
	readonly placeholderUrl = STATIC_URL + "images/cardback_placeholder_kabal.png";
	readonly defaultQueryMap: QueryMap = {
		cost: "",
		format: "",
		mechanics: "",
		type: "",
		set: "",
		rarity: "",
		race: "",
		playerClass: "ALL",
		text: "",
	}

	constructor(props: CardDiscoverProps, state: CardDiscoverState) {
		super(props, state);
		this.state = {
			cards: null,
			queryMap: getQueryMapFromLocation(this.defaultQueryMap, {}),
			numCards: 24,
			showFilters: false,
		}
		this.fetchPlaceholderImage();
		this.filters.mechanics.sort();
	}

	fetchPlaceholderImage() {
		const image = new Image();
		image.src = this.placeholderUrl;
	}

	componentDidUpdate() {
		setLocationQueryString(this.state.queryMap, this.defaultQueryMap);
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
		const queryMap = Object.assign({}, this.state.queryMap);

		const tiles = [];
		const filteredCards = {
			playerClass: [],
			cost: [],
			rarity: [],
			set: [],
			type: [],
			race: [],
			mechanics: [],
			format: [],
		}
		const allFilteredCards = [];
		const filterKeys = Object.keys(filteredCards);

		if (this.state.cards) {
			this.state.cards.forEach(card => {
				filterKeys.forEach(x => {
					if (!this.filter(card, x)) {
						filteredCards[x].push(card);
					}
				});
				if (!this.filter(card)) {
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
					allFilteredCards.push(card);
				}
			});
		}


		let showMoreButton = null;
		if (this.state.cards && allFilteredCards.length > this.state.numCards) {
			showMoreButton = (
				<div className="more-button">
					<button type="button" className="btn btn-default" onClick={() => this.setState({numCards: this.state.numCards + 10})}>
						Show more...
					</button>
				</div>
			)
		}

		let content = null;
		if(this.state.cards && !allFilteredCards.length) {
			content = (
				<div className="no-search-result">
					<h2>No cards found</h2>
					<button className="btn btn-default" type="button" onClick={() => this.setState({queryMap: this.defaultQueryMap})}>Reset filters</button>
				</div>
			);
		}
		else {
			content = [
				<div className="card-list">
					{tiles}
				</div>,
				showMoreButton
			];
		}

		let search = null;

		const filterCounts = this.filterCounts(filteredCards);
		const filterClassNames = ["infobox full-xs"];
		const contentClassNames = ["card-list-wrapper"]
		if (!this.state.showFilters) {
			filterClassNames.push("hidden-xs");
			search = (
				<div className="search-wrapper">
					<button className="btn btn-default visible-xs" type="button" onClick={() => this.setState({showFilters: !this.state.showFilters})}>
						<span className="glyphicon glyphicon-filter"/>
						Filters
					</button>
					<input 
						autoFocus
						placeholder="Search..."
						type="search"
						className="form-control"
						value={queryMap["text"]}
						onChange={(x) => setQueryMap(this, "text", x.target["value"])}
					/>
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

		return (
			<div className="card-discover">
				<div className={filterClassNames.join(" ")} id="card-discover-infobox">
					{backButton}
					{this.buildFilters(filterCounts)}
					{backButton}
				</div>
				<div className={contentClassNames.join(" ")}>
					{search}
					{content}
				</div>
			</div>
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

	buildFilters(filterCounts: CardFilters): JSX.Element[] {
		let showReset = queryMapHasChanges(this.state.queryMap, this.defaultQueryMap);

		return [
			<ResetHeader onReset={() => this.setState({queryMap: this.defaultQueryMap})} showReset={showReset}>
				Card Database
			</ResetHeader>,
			<h2>Class</h2>,
			<ClassFilter 
				filters="AllNeutral"
				hideAll
				minimal
				multiSelect={false}
				selectedClasses={[this.state.queryMap["playerClass"] as FilterOption]}
				selectionChanged={(selected) => setQueryMap(this, "playerClass", selected[0])}
			/>,
			<h2>Cost</h2>,
			<InfoboxFilterGroup deselectable classNames={["filter-list-cost"]} selectedValue={getQueryMapArray(this.state.queryMap, "cost")} onClick={(value, sender) => filterCounts.cost && this.onFilterItemClick("cost", sender, value)}>
				{this.buildCostFilters(filterCounts.cost)}
			</InfoboxFilterGroup>,
			<h2>Rarity</h2>,
			<InfoboxFilterGroup deselectable selectedValue={getQueryMapArray(this.state.queryMap, "rarity")} onClick={(value, sender) => filterCounts.rarity && this.onFilterItemClick("rarity", sender, value)}>
				{this.buildFilterItems("rarity", filterCounts.rarity)}
			</InfoboxFilterGroup>,
			<h2>Set</h2>,
			<InfoboxFilterGroup deselectable selectedValue={getQueryMapArray(this.state.queryMap, "set")} onClick={(value, sender) => filterCounts.set && this.onFilterItemClick("set", sender, value)}>
				{this.buildFilterItems("set", filterCounts.set)}
				{this.buildFormatFilter(filterCounts.format["standard"])}
			</InfoboxFilterGroup>,
			<h2>Type</h2>,
			<InfoboxFilterGroup deselectable selectedValue={getQueryMapArray(this.state.queryMap, "type")} onClick={(value, sender) => filterCounts.type && this.onFilterItemClick("type", sender, value)}>
				{this.buildFilterItems("type", filterCounts.type)}
			</InfoboxFilterGroup>,
			<h2>Race</h2>,
			<InfoboxFilterGroup deselectable selectedValue={getQueryMapArray(this.state.queryMap, "race")} onClick={(value, sender) => filterCounts.race && this.onFilterItemClick("race", sender, value)}>
				{this.buildFilterItems("race", filterCounts.race)}
			</InfoboxFilterGroup>,
			<h2>Mechanics</h2>,
			<InfoboxFilterGroup deselectable selectedValue={getQueryMapArray(this.state.queryMap, "mechanics")} onClick={(value, sender) => filterCounts.mechanics && this.onFilterItemClick("mechanics", sender, value)}>
				{this.buildFilterItems("mechanics", filterCounts.mechanics)}
			</InfoboxFilterGroup>,
		];
	}

	onFilterItemClick(key: string, sender: string, value: string): void {
		const values = getQueryMapArray(this.state.queryMap, key);
		const newFilter = value === null ? values.filter(x => x !== sender) : values.concat(value);
		console.log(key, sender, value, values, newFilter)
		setQueryMap(this, key, newFilter.join(","))
	}

	buildFilterItems(key: string, counts: any): JSX.Element[] {
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
		return this.filters["cost"].map(item => (
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
			const text = queryMap["text"].toLowerCase();
			if (card.name.toLowerCase().indexOf(text) === -1) {
				if (!card.text || card.text.toLowerCase().indexOf(text) === -1) {
					return true;
				}
			}
		}

		let filter = false;
		Object.keys(this.filters).forEach(key => {
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

}
