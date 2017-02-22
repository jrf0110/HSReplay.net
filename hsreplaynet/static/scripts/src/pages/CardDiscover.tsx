import * as React from "react";
import CardDetailBarChart from "../components/charts/CardDetailBarChart";
import CardDetailPieChart from "../components/charts/CardDetailPieChart";
import CardImage from "../components/CardImage";
import CardTile from "../components/CardTile";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import {ChartSeries} from "../interfaces";
import {cardSorting, setNames, toTitleCase, wildSets} from "../helpers";

interface CardFilters {
	playerClass: any;
	cost: any;
	rarity: any;
	set: any;
	type: any;
	race: any;
	mechanics: any;
	format: any;
}

interface CardDiscoverState {
	textFilter?: string;
	cards?: any[];
	filters?: Map<string, string[]>;
	numCards?: number;
	showFilters?: boolean;
}

interface CardDiscoverProps extends React.ClassAttributes<CardDiscover> {
	cardData: Map<string, any>;
}

export default class CardDiscover extends React.Component<CardDiscoverProps, CardDiscoverState> {
	readonly filters = {
		cost: [0, 1, 2, 3, 4, 5, 6, 7],
		format: ["Standard only"],
		mechanics: [
			"ENRAGED", "DEATHRATTLE", "TAUNT", "BATTLECRY", "CHARGE", "DIVINE_SHIELD", "WINDFURY",
			"CHOOSE_ONE", "INSPIRE", "JADE_GOLEM", "COMBO", "FREEZE", "STEALTH"
		],
		type: ["MINION", "SPELL", "WEAPON"],
		set: ["CORE", "EXPERT1", "GANGS", "KARA", "OG", "LOE", "TGT", "BRM", "GVG", "NAXX", "PROMO", "REWARD"],
		rarity: ["FREE", "COMMON", "RARE", "EPIC", "LEGENDARY"],
		race: ["BEAST", "DEMON", "DRAGON", "MECHANICAL", "MURLOC", "PIRATE", "TOTEM"],
		playerClass: ["DRUID", "HUNTER", "MAGE", "PALADIN", "PRIEST", "ROGUE", "SHAMAN", "WARLOCK", "WARRIOR", "NEUTRAL"],
	};
	readonly placeholderUrl = STATIC_URL + "images/cardback_placeholder_kabal.png";

	constructor(props: CardDiscoverProps, state: CardDiscoverState) {
		super(props, state);
		this.state = {
			textFilter: null,
			cards: null,
			filters: new Map<string, string[]>(),
			numCards: 20,
			showFilters: false,
		}
		this.fetchPlaceholderImage();
	}

	fetchPlaceholderImage() {
		const image = new Image();
		image.src = this.placeholderUrl;
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
		let chartSeries = null;
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
								placeholder={this.placeholderUrl}
								key={card.id}
							/>
						);
					}
					allFilteredCards.push(card);
				}
			});

			chartSeries = allFilteredCards.length && this.buildChartSeries(allFilteredCards);
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
					<a href="#" onClick={() => this.resetFilters()}>Reset filters</a>
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
						value={this.state.textFilter}
						onChange={(x) => this.setState({textFilter: x.target["value"]})}
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
					<h1>Card Database</h1>
					{backButton}
					{this.buildFilters(filterCounts)}
					{backButton}
				</div>
				<div className={contentClassNames.join(" ")}>
					{search}
					{content}
				</div>
				<div className="chart-list visible-lg">
					<CardDetailBarChart labelX="Cost" widthRatio={1.8} title="Cost" renderData={chartSeries ? {series: [chartSeries[3]]} : "loading"} />
					<div className="chart-wrapper">
						<CardDetailPieChart renderData={chartSeries ? {series: [chartSeries[4]]} : "loading"} title="Classes"/>
					</div>
					<div className="chart-wrapper">
						<CardDetailPieChart renderData={chartSeries ? {series: [chartSeries[0]]} : "loading"} title="Rarity"/>
					</div>
					<div className="chart-wrapper">
						<CardDetailPieChart renderData={chartSeries ? {series: [chartSeries[2]]} : "loading"} title="Set"/>
					</div>
					<div className="chart-wrapper">
						<CardDetailPieChart renderData={chartSeries ? {series: [chartSeries[1]]} : "loading"} title="Type"/>
					</div>
				</div>
			</div>
		);
	}

	resetFilters() {
		this.setState({
			filters: new Map<string, string[]>(),
			textFilter: "",
		});
	}

	buildChartSeries(cards: any[]): ChartSeries[] {
		const chartSeries = [];

		const data = {rarity: {}, cardtype: {}, cardset: {}, cost: {}, class: {}};
		cards.forEach(card => {
			data["rarity"][card.rarity] = (data["rarity"][card.rarity] || 0) + 1;
			data["cardtype"][card.type] = (data["cardtype"][card.type] || 0) + 1;
			data["cardset"][card.set] = (data["cardset"][card.set] || 0) + 1;
			const cost = ""+Math.min(7, card.cost);
			data["cost"][cost] = (data["cost"][cost] || 0) + 1;
			data["class"][card.playerClass] = (data["class"][card.playerClass] || 0) + 1;
		});
		Object.keys(data).forEach(name => {
			const series = {
				name: name,
				data: [],
				metadata: {
					chart_scheme: name
				}
			}
			Object.keys(data[name]).forEach(value => {
				series.data.push({x: value.toLowerCase(), y: data[name][value]});
			})
			chartSeries.push(series);
		})
		return chartSeries;
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
						filters.format["Standard only"] = (filters.format["Standard only"] || 0) + 1;
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
		let showReset = this.state.textFilter && !!this.state.textFilter.length;
		if (!showReset) {
			this.state.filters.forEach((val, key) => {
				if (val && val.length) {
					showReset = true;
				}
			});
		}

		let resetButton = null;
		if (showReset) {
			resetButton = <button className="btn btn-danger btn-full" onClick={() => this.resetFilters()}>Reset all filters</button>
		}
		return [
			resetButton,
			<h2>Class</h2>,
			<ClassFilter 
				filters="AllNeutral"
				hideAll
				minimal
				multiSelect={false}
				selectedClasses={(this.state.filters.get("playerClass") || ["ALL"]) as FilterOption[]}
				selectionChanged={(selection) => {
					const selected = selection && selection.find(x => x !== "ALL");
					this.setState({filters: this.state.filters.set("playerClass", selected && [selected])});
				}}
			/>,
			<h2>Cost</h2>,
			<ul className="filter-list-cost">
				{this.getFilterItems("cost", filterCounts.cost)}
			</ul>,
			<h2>Rarity</h2>,
			<ul>
				{this.getFilterItems("rarity", filterCounts.rarity)}
			</ul>,
			<h2>Set</h2>,
			<ul>
				{this.getFilterItems("set", filterCounts.set)}
				{this.buildFilterItem("format", "Standard only", filterCounts.format["Standard only"])}
			</ul>,
			<h2>Type</h2>,
			<ul>
				{this.getFilterItems("type", filterCounts.type)}
			</ul>,
			<h2>Race</h2>,
			<ul>
				{this.getFilterItems("race", filterCounts.race)}
			</ul>,
			<h2>Mechanics</h2>,
			<ul>
				{this.getFilterItems("mechanics", filterCounts.mechanics)}
			</ul>
		];
	}

	getFilterItems(key: string, counts: any): JSX.Element[] {
		return this.filters[key].map(item => {
			return this.buildFilterItem(key, ''+item, counts[item])
		});
	}

	buildFilterItem(prop: string, value: string, count: number) {
		let text = ''+value;
		switch(prop) {
			case "set":
				text = setNames[text.toLowerCase()];
				break;
			case "mechanics":
				if (text === "ENRAGED") {
					text = "ENRAGE";
				}
				text = text.split("_").map(x => toTitleCase(x)).join(" ");
				break;
			case "cost":
				text = +value < 7 ? text : " 7+";
				break;
			default:
				text = toTitleCase(value);
				break;
		}
		const selected = this.state.filters.get(prop) && this.state.filters.get(prop).indexOf(value) !== -1;

		const onClick = () => {
			if (count) {
				const newFilter = selected ? this.state.filters.get(prop).filter(x => x !== value) : (this.state.filters.get(prop) || []).concat(value);
				this.setState({
					filters: this.state.filters.set(prop, newFilter)
				})
			}
		};

		const classNames = ["filter-item selectable"];
		if (!count) {
			classNames.push("disabled");
		}
		if (selected) {
			classNames.push("selected");
		}
		
		if (prop !== "cost") {
			return <li className={classNames.join(" ")} onClick={onClick}>
				{text}
				<span className="infobox-value">
					{count || 0}
				</span>
			</li>;
		}

		classNames.push("mana-crystal");

		return <li className={classNames.join(" ")} onClick={onClick}>
			<img src={STATIC_URL + "images/mana_crystal.png"} height={28}/>
			<div>{text}</div>
		</li>

	}

	filter(card: any, exlcudeFilter?: string): boolean {
		if (this.state.textFilter) {
			const text = this.state.textFilter.toLowerCase();
			if (card.name.toLowerCase().indexOf(text) === -1) {
				if (!card.text || card.text.toLowerCase().indexOf(text) === -1) {
					return true;
				}
			}
		}

		let filter = false;
		this.state.filters.forEach((values, key) => {
			if (key === exlcudeFilter || !values || !values.length) {
				return;
			}

			const available = this.filters[key].filter(x => values.indexOf(''+x) !== -1);
			if (!filter && available.length) {
				const cardValue = card[key];
				if (key === "format") {
					if (values.indexOf("Standard only") !== -1) {
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
