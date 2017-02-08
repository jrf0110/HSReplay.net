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

interface CardDiscoverState {
	filter?: string;
	cards?: any[];
	sortProp?: string;
	sortDirection?: number;
	filters?: Map<string, string[]>;
	availableFilters?: CardFilters;
	numCards?: number;
}

interface CardDiscoverProps extends React.ClassAttributes<CardDiscover> {
	cardData: Map<string, any>;
}

export default class CardDiscover extends React.Component<CardDiscoverProps, CardDiscoverState> {
	readonly wildSets = ["NAXX", "GVG", "PROMO", "REWARD"];
	readonly placeholderUrl = STATIC_URL + "images/cardback_placeholder_kabal.png";

	constructor(props: CardDiscoverProps, state: CardDiscoverState) {
		super(props, state);
		this.state = {
			filter: null,
			cards: null,
			sortProp: "name",
			sortDirection: 1,
			filters: new Map<string, string[]>(),
			availableFilters: null,
			numCards: 20,
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
				if (card.collectible && ["MINION", "SPELL", "WEAPON"].indexOf(card.type) !== -1) {
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
			this.state.cards.sort((a, b) => a[this.state.sortProp] > b[this.state.sortProp] ? this.state.sortDirection : -this.state.sortDirection).forEach(card => {
				if (card.name && (!this.state.filter || card.name.toLowerCase().indexOf(this.state.filter.toLowerCase()) !== -1)) {
					filterKeys.forEach(x => {
						if (!this.filter(card, x)) {
							filteredCards[x].push(card);
						}
					})
					if (!this.filter(card)) {
						if (tiles.length < this.state.numCards) {
							tiles.push(<CardImage cardId={card.id} placeholder={this.placeholderUrl} key={card.id}/>);
						}
						allFilteredCards.push(card);
					}
				}
			});

			chartSeries = this.buildChartSeries(allFilteredCards);
		}

		const availableFilters = this.buildAvailableFilters(filteredCards);
		this.state.availableFilters = availableFilters;

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

		let showReset = false;
		this.state.filters.forEach((val, key) => {
			if (val && val.length) {
				showReset = true;
			}
		});

		let resetButton = null;
		if (showReset) {
			resetButton = <a href="#" onClick={() => this.setState({filters: new Map<string, string[]>()})}>Reset all filters</a>
		}

		return (
			<div className="row card-discover">
				<div className="col-lg-2 col-md-2 filter-col">
					{this.buildFilters(availableFilters)}
					<div className="reset-wrapper">
						{resetButton}
					</div>
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
					{tiles}
					{showMoreButton}
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

	buildAvailableFilters(cardFilters: CardFilters) : CardFilters {
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
					if (!filters.format["Standard only"] && this.wildSets.indexOf(card.set) === -1){
						filters.format["Standard only"] = 1;
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

	buildFilters(filters: CardFilters): JSX.Element {
		const mechanics = [
			"ENRAGED", "DEATHRATTLE", "TAUNT", "BATTLECRY", "CHARGE", "DIVINE_SHIELD", "WINDFURY",
			"CHOOSE_ONE", "INSPIRE", "JADE_GOLEM", "COMBO", "FREEZE", "STEALTH", "DISCOVER"
		]
		const sort = (obj: any): any => {
			return Object.keys(obj).sort((a, b) => obj[a] < obj[b] ? 1 : -1);
		}
		return (
			<div className="panel panel-default filter-panel">
				<div className="panel-heading">Cost</div>
				<div className="panel-body cost-filter">
					{[0, 1, 2, 3, 4, 5, 6, 7].filter(x => Object.keys(filters.cost).indexOf(''+x) !== -1).map(x => this.buildCheckBox("cost", ''+x))}
				</div>
				<div className="panel-heading">Rarity</div>
				<div className="panel-body">
					{["FREE", "COMMON", "RARE", "EPIC", "LEGENDARY"].filter(x => Object.keys(filters.rarity).indexOf(x) !== -1).map(x => this.buildCheckBox("rarity", x, filters.rarity[x], true))}
				</div>
				<div className="panel-heading">Format</div>
				<div className="panel-body">
					{sort(filters.format).map(x => this.buildCheckBox("format", x, undefined, true))}
				</div>
				<div className="panel-heading">Set</div>
				<div className="panel-body">
					{sort(filters.set).map(x => this.buildCheckBox("set", x, filters.set[x], true))}
				</div>
				<div className="panel-heading">Type</div>
				<div className="panel-body">
					{sort(filters.type).map(x => this.buildCheckBox("type", x, filters.type[x], true))}
				</div>
				<div className="panel-heading">Race</div>
				<div className="panel-body">
					{sort(filters.race).map(x => this.buildCheckBox("race", x, filters.race[x], true))}
				</div>
				<div className="panel-heading">Mechanics</div>
				<div className="panel-body">
					{sort(filters.mechanics).filter(x => mechanics.indexOf(x) !== -1).map(x => this.buildCheckBox("mechanics", x, filters.mechanics[x], true))}
				</div>
			</div>
		);
	}

	buildCheckBox(prop: string, value: string, count?: number, div?: boolean) {
		let text = null;
		switch(prop) {
			case "set":
				text = setNames[value.toLowerCase()];
				break;
			case "mechanics":
				text = value.split("_").map(x => toTitleCase(x)).join(" ");
				break;
			case "cost":
				text = +value < 7 ? ''+value : "7+";
				break;
			default:
				text = toTitleCase(value);
				break;
		}
		const selected = this.state.filters.get(prop) && this.state.filters.get(prop).indexOf(value) !== -1;

		const onClick = () => {
			const newFilter = selected ? this.state.filters.get(prop).filter(x => x !== value) : (this.state.filters.get(prop) || []).concat(value);
			this.setState({
				filters: this.state.filters.set(prop, newFilter)
			})
		};

		const classNames = ["filter-item"];
		if (selected) {
			classNames.push("selected");
		}
		
		if (div) {
			const countBadge = (
				<span className="badge pull-right">
					{count}
				</span>
			);
			return <div className={classNames.join(" ")} onClick={onClick}>
				<span>{text}</span>
				{countBadge}
			</div>;
		}

		return <span className={classNames.join(" ")} onClick={onClick}>
			<span className="badge">
				{text}
			</span>
		</span>

	}

	filter(card: any, exlcudeFilter?: string): boolean {
		let filter = false;
		this.state.filters.forEach((values, key) => {
			if (key === exlcudeFilter) {
				return;
			}
			let available= [];
			if (values && this.state.availableFilters) {
				available = values.filter(x => Object.keys(this.state.availableFilters[key]).indexOf(x) !== -1).slice();
			}
			if (!filter && available.length) {
				const cardValue = card[key];
				if (key === "format") {
					if (available.indexOf("Standard only") !== -1) {
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
					filter = available.indexOf(""+Math.min(cardValue, 7)) === -1;
				}
				else {
					filter = available.indexOf(cardValue) === -1;
				}
			}
		});
		return filter;
	}

}
