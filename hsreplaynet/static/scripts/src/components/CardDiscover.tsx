import * as React from "react";
import CardTile from "./CardTile";
import CardDiscoverFilter from "./CardDiscoverFilter";
import CardDetailBarChart from "./charts/CardDetailBarChart";
import CardDetailPieChart from "./charts/CardDetailPieChart";
import ClassFilter from "./ClassFilter";
import {ChartSeries} from "../interfaces";
import {setNames, toTitleCase} from "../helpers";
import CardImage from "./CardImage";

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

// "classFilterKey" is a bit of a hack to reset the ClassFilter component.
// Changing the key attribute on an element causes it to be re-created.
// TODO: remove ClassFilter internal state

interface CardDiscoverState {
	filter?: string;
	cards?: any[];
	sortProps?: string[];
	sortDirection?: number;
	filters?: Map<string, string[]>;
	numCards?: number;
	classFilterKey?: number;
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
	readonly wildSets = ["NAXX", "GVG", "PROMO", "REWARD"];
	readonly placeholderUrl = STATIC_URL + "images/cardback_placeholder_kabal.png";

	constructor(props: CardDiscoverProps, state: CardDiscoverState) {
		super(props, state);
		this.state = {
			filter: null,
			cards: null,
			sortProps: ["name", "cost"],
			sortDirection: 1,
			filters: new Map<string, string[]>(),
			numCards: 20,
			classFilterKey: 0,
		}
		this.fetchPlaceholderImage();
	}

	fetchPlaceholderImage() {
		const image = new Image();
		image.src = this.placeholderUrl;
	}

	render(): JSX.Element {
		if (this.props.cardData && !this.state.cards) {
			const cards = [];
			this.props.cardData.forEach((card, id) => {
				if (card.collectible && this.filters.type.indexOf(card.type) !== -1) {
					cards.push(card);
				}
			});
			this.state.cards = cards;
		}

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
			this.state.sortProps.forEach(x => {
				this.state.cards.sort((a, b) => a[x] > b[x] ? this.state.sortDirection : -this.state.sortDirection);
			})
			this.state.cards.forEach(card => {
				if (card.name && (!this.state.filter || card.name.toLowerCase().indexOf(this.state.filter.toLowerCase()) !== -1)) {
					filterKeys.forEach(x => {
						if (!this.filter(card, x)) {
							filteredCards[x].push(card);
						}
					});
					if (!this.filter(card)) {
						if (tiles.length < this.state.numCards) {
							tiles.push(<CardImage cardId={card.id} placeholder={this.placeholderUrl} key={card.id}/>);
						}
						allFilteredCards.push(card);
					}
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
				<div className="card-list-wrapper">
					{tiles}
				</div>,
				showMoreButton
			];
		}

		const filterCounts = this.filterCounts(filteredCards);

		return (
			<div className="row card-discover">
				<div className="col-lg-2 col-md-2 filter-col">
					{this.buildFilters(filterCounts)}
				</div>
				<div className="col-lg-8 col-md-8 content-col">
					<div className="form-group">
						<input 
							autoFocus
							placeholder="Search..."
							type="text"
							className="form-control search-bar"
							value={this.state.filter}
							onChange={(x) => this.setState({filter: x.target["value"]})}
						/>
					</div>
					<div>
						<ClassFilter 
							key={this.state.classFilterKey}
							multiSelect={false}
							filters="AllNeutral"
							filterStyle="icon"
							selectionChanged={(selection) => {
									let selected = null;
									selection.forEach((val, key) => {
										if (val && key !== "ALL") {
											selected = key;
										}
									});
									this.setState({filters: this.state.filters.set("playerClass", selected && [selected])});
								}
							}
						/>
					</div>
					{content}
				</div>
				<div className="col-lg-2 col-md-2 chart-col">
					<CardDetailBarChart labelX="Cost" widthRatio={1.8} title="Cost" series={chartSeries && chartSeries[3]}/>
					<div className="chart-wrapper">
						<CardDetailPieChart series={chartSeries && chartSeries[4]} title="Classes"/>
					</div>
					<div className="chart-wrapper">
						<CardDetailPieChart series={chartSeries && chartSeries[0]} title="Rarity"/>
					</div>
					<div className="chart-wrapper">
						<CardDetailPieChart series={chartSeries && chartSeries[2]} title="Set"/>
					</div>
					<div className="chart-wrapper">
						<CardDetailPieChart series={chartSeries && chartSeries[1]} title="Type"/>
					</div>
				</div>
			</div>
		);
	}

	resetFilters() {
		this.setState({
			filters: new Map<string, string[]>(),
			filter: "",
			classFilterKey: this.state.classFilterKey + 1,
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
					if (this.wildSets.indexOf(card.set) === -1){
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

	buildFilters(filterCounts: CardFilters): JSX.Element {
		let showReset = false;
		this.state.filters.forEach((val, key) => {
			if (val && val.length) {
				showReset = true;
			}
		});

		let resetButton = null;
		if (showReset) {
			resetButton = <a href="#" onClick={() => this.resetFilters()}>Reset all filters</a>
		}
		return (
			<div className="panel panel-default filter-panel">
				<div className="panel-heading">
					Cost
					<div className="pull-right">
						{resetButton}
					</div>
				</div>
				<div className="panel-body cost-filter">
					{this.filters.cost.map(x => this.buildFilterItem("cost", ''+x, filterCounts.cost[x]))}
				</div>
				<div className="panel-heading">Rarity</div>
				<div className="panel-body">
					{this.filters.rarity.map(x => this.buildFilterItem("rarity", x, filterCounts.rarity[x], true))}
				</div>
				<div className="panel-heading">Set</div>
				<div className="panel-body">
					{this.filters.set.map(x => this.buildFilterItem("set", x, filterCounts.set[x], true))}
					{this.buildFilterItem("format", "Standard only", filterCounts.format["Standard only"], true)}
				</div>
				<div className="panel-heading">Type</div>
				<div className="panel-body">
					{this.filters.type.map(x => this.buildFilterItem("type", x, filterCounts.type[x], true))}
				</div>
				<div className="panel-heading">Race</div>
				<div className="panel-body">
					{this.filters.race.map(x => this.buildFilterItem("race", x, filterCounts.race[x], true))}
				</div>
				<div className="panel-heading">Mechanics</div>
				<div className="panel-body">
					{this.filters.mechanics.map(x => this.buildFilterItem("mechanics", x, filterCounts.mechanics[x], true))}
				</div>
			</div>
		);
	}

	buildFilterItem(prop: string, value: string, count: number, div?: boolean) {
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

		const classNames = ["filter-item"];
		if (prop === "format") {
			classNames.push("format");
		}
		if (!count) {
			classNames.push("disabled");
		}
		if (selected) {
			classNames.push("selected");
		}
		
		if (div) {
			const countBadge = (
				<span className="badge pull-right">
					{count || 0}
				</span>
			);
			return <div className={classNames.join(" ")} onClick={onClick}>
				<span className="filter-item-text pull-left">{text}</span>
				{countBadge}
			</div>;
		}

		classNames.push("mana-crystal");

		return <div className={classNames.join(" ")} onClick={onClick}>
			<img src={STATIC_URL + "images/mana_crystal.png"} height={28}/>
			<div>{text}</div>
		</div>

	}

	filter(card: any, exlcudeFilter?: string): boolean {
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
						filter = this.wildSets.indexOf(card.set) !== -1;
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
