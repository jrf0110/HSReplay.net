import * as React from "react";
import CardDetailBarChart from "../components/charts/CardDetailBarChart";
import CardDetailPieChart from "../components/charts/CardDetailPieChart";
import CardRankingTable from "../components/CardRankingTable";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import QueryManager from "../QueryManager";
import ResetHeader from "../components/ResetHeader";
import { TableData, TableQueryData, ChartSeries, GameMode, TimeFrame} from "../interfaces";
import {
	QueryMap, getQueryMapArray, getQueryMapFromLocation, queryMapHasChanges,
	setLocationQueryString, setQueryMap, toQueryString
} from "../QueryParser"

interface PopularCardsState {
	numRowsVisible?: number;
	queryMap?: QueryMap;
	showFilters?: boolean;
	topCardsIncluded?: Map<string, TableData>;
	topCardsPlayed?: Map<string, TableData>;
}

interface PopularCardsProps extends React.ClassAttributes<PopularCards> {
	cardData: Map<string, any>;
}

export default class PopularCards extends React.Component<PopularCardsProps, PopularCardsState> {
	private readonly queryManager: QueryManager = new QueryManager();
	private readonly defaultQueryMap: QueryMap = {
		gameType: "RANKED_STANDARD",
		playerClass: "ALL",
		timeRange: "LAST_30_DAYS",
	}
	private readonly allowedValues = {
		gameType: ["RANKED_STANDARD", "RANKED_WILD", "ARENA"],
		rankRange: [],
		region: [],
		timeRange: ["LAST_30_DAYS"],
	}

	constructor(props: PopularCardsProps, state: PopularCardsState) {
		super(props, state);
		this.state = {
			numRowsVisible: 12,
			queryMap: getQueryMapFromLocation(this.defaultQueryMap, this.allowedValues),
			showFilters: false,
			topCardsIncluded: new Map<string, TableData>(),
			topCardsPlayed: new Map<string, TableData>(),
		}
		
		this.fetchIncluded();
		this.fetchPlayed();
	}
	
	cacheKey(state?: PopularCardsState): string {
		const queryMap = (state || this.state).queryMap;
		const cacheKey = [];
		Object.keys(this.allowedValues).forEach(key => {
			const value = this.allowedValues[key];
			if (value.length) {
				cacheKey.push(queryMap[key]);
			}
		});
		return cacheKey.join("");
	}

	componentDidUpdate(prevProps: PopularCardsProps, prevState: PopularCardsState) {
		const cacheKey = this.cacheKey();
		const prevCacheKey = this.cacheKey(prevState);
		if (cacheKey !== prevCacheKey) {
			let deckData = this.state.topCardsIncluded.get(cacheKey);
			if (!deckData || deckData === "error") {
				this.fetchIncluded();
			}
			
			deckData = this.state.topCardsPlayed.get(cacheKey);
			if (!deckData || deckData === "error") {
				this.fetchPlayed();
			}
		}
		setLocationQueryString(this.state.queryMap, this.defaultQueryMap);
	}

	render(): JSX.Element {
		const queryMap = Object.assign({}, this.state.queryMap);
		
		const selectedClass = queryMap["playerClass"];

		const showMoreButton = this.state.numRowsVisible >= 100 ? null
			: <button className="btn btn-default"
			type="button"
			onClick={() => this.setState({numRowsVisible: Math.max(15, this.state.numRowsVisible) * 2})}>
			{"Show more..."}
		</button>;

		const played = this.state.topCardsPlayed.get(this.cacheKey());
		const included = this.state.topCardsIncluded.get(this.cacheKey());

		let content = null;
		if (!played || !included || played === "loading" || included === "loading" || !this.props.cardData) {
			content = (
				<div className="content-message">
					<h2>Counting cards...</h2>
				</div>
			);
		}
		else if (played === "error" || included === "error") {
			content = (
				<div className="content-message">
					<h2>Alright, working on it...</h2>
					Please check back later.
				</div>
			);
		}
		else {
			const chartSeries = this.buildChartSeries(included);
			content = [
				<div className ="row">
					<div className="chart-column col-lg-3 col-md-3 col-sm-6 col-xs-6">
						<div className="chart-wrapper">
							<CardDetailPieChart percent title="Rarity" renderData={chartSeries.length ? {series: [chartSeries[0]]} : "loading"}/>
						</div>
					</div>
					<div className="chart-column col-lg-3 col-md-3 col-sm-6 col-xs-6">
						<div className="chart-wrapper">
							<CardDetailPieChart percent title="Type" renderData={chartSeries.length ? {series: [chartSeries[1]]} : "loading"}/>
						</div>
					</div>
					<div className="chart-column col-lg-3 col-md-3 col-sm-6 col-xs-6">
						<div className="chart-wrapper">
							<CardDetailPieChart percent title="Set" renderData={chartSeries.length ? {series: [chartSeries[2]]} : "loading"}/>
						</div>
					</div>
					<div className="chart-column col-lg-3 col-md-3 col-sm-6 col-xs-6">
						<div className="chart-wrapper">
							<CardDetailPieChart percent title="Cost" renderData={chartSeries.length ? {series: [chartSeries[3]]} : "loading"}/>
						</div>
					</div>
				</div>,
				<div className="row">
					<div className="col-lg-6 col-md-6 col-sm-12 col-xs-12">
						<h2>Most included cards</h2>
						<div>
							<CardRankingTable 
								numRows={this.state.numRowsVisible}
								tableData={included}
								dataKey={selectedClass}
								cardData={this.props.cardData}
							/>
						</div>
					</div>
					<div className="col-lg-6 col-md-6 col-sm-12 col-xs-12">
						<h2>Most played cards</h2>
						<div>
							<CardRankingTable 
								numRows={this.state.numRowsVisible}
								tableData={played}
								dataKey={selectedClass}
								cardData={this.props.cardData}
							/>
						</div>
					</div>
				</div>,
				<div className="button-more-wrapper row">
					{showMoreButton}
				</div>
			];
		}
		
		const filterClassNames = ["infobox full-sm"];
		const contentClassNames = ["report-content container-fluid"]
		if (!this.state.showFilters) {
			filterClassNames.push("hidden-xs hidden-sm");
		}
		else {
			contentClassNames.push("hidden-xs hidden-sm");
		}
		
		const backButton = (
			<button className="btn btn-primary btn-full visible-sm visible-xs" type="button" onClick={() => this.setState({showFilters: false})}>
				Back to the exhibition
			</button>
		);

		return <div className="report-container" id="card-popularity-report">
			<div className={filterClassNames.join(" ")}>
				{backButton}
				<ResetHeader onReset={() => this.setState({queryMap: this.defaultQueryMap})} showReset={queryMapHasChanges(this.state.queryMap, this.defaultQueryMap)}>
					Card Menagerie
				</ResetHeader>
				<h2>Class</h2>
				<ClassFilter 
					hideAll
					multiSelect={false}
					filters="AllNeutral"
					minimal
					selectedClasses={[queryMap["playerClass"] as FilterOption]}
					selectionChanged={(selected) => setQueryMap(this, "playerClass", selected[0])}
				/>
				<h2>Mode</h2>
				<ul>
					{this.buildFilter("gameType", "RANKED_STANDARD", "Standard")}
					{this.buildFilter("gameType", "RANKED_WILD", "Wild")}
					{this.buildFilter("gameType", "ARENA", "Arena")}
				</ul>
				<h2>Time frame</h2>
				<ul>
					{this.buildFilter("timeRange", "LAST_30_DAYS", "Last 30 days")}
				</ul>
				{backButton}
			</div>
			<div className={contentClassNames.join(" ")}>
				<button
					className="btn btn-default visible-xs visible-sm"
					type="button"
					onClick={() => this.setState({showFilters: true})}
				>
					<span className="glyphicon glyphicon-filter"/>
					Filters
				</button>
				{content}
			</div>
		</div>;
	}
	
	buildFilter(prop: string, key: string, displayValue: string, defaultValue?: string): JSX.Element {
		const selected = this.state.queryMap[prop] === key;
		const onClick = () => {
			if (!selected || defaultValue !== undefined) {
				setQueryMap(this, prop, selected? defaultValue : key);
			}
		}
		
		const classNames = ["selectable"];
		if (selected) {
			classNames.push("selected");
			if (!defaultValue) {
				classNames.push("no-deselect");
			}
		}

		return (
			<li onClick={onClick} className={classNames.join(" ")}>
				{displayValue}
			</li>
		);
	}

	buildChartSeries(topCardsIncluded: TableQueryData): ChartSeries[] {
		const chartSeries = [];

		if (this.props.cardData && this.state.topCardsIncluded) {
			const selectedClass = this.state.queryMap["playerClass"];
			const rows = topCardsIncluded.series.data[selectedClass];
			const data = {rarity: {}, cardtype: {}, cardset: {}, cost: {}};
			const totals = {rarity: 0, cardtype: 0, cardset: 0, cost: 0};
			rows.forEach(row => {
				const card = this.props.cardData.get(row["card_id"])
				const value = +row["popularity"]
				data["rarity"][card.rarity] = (data["rarity"][card.rarity] || 0) + value;
				totals["rarity"] += value;
				data["cardtype"][card.type] = (data["cardtype"][card.type] || 0) + value;
				totals["cardtype"] += value;
				data["cardset"][card.set] = (data["cardset"][card.set] || 0) + value;
				totals["cardset"] += value;
				const cost = ""+Math.min(7, card.cost);
				data["cost"][cost] = (data["cost"][cost] || 0) + value;
				totals["cost"] += value;
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
					series.data.push({x: value.toLowerCase(), y: Math.ceil(100.0 * data[name][value] / totals[name])});
				})
				chartSeries.push(series);
			})
		}
		return chartSeries;
	}
	
	getQueryParams(): string {
		const params = {
			TimeRange: this.state.queryMap["timeRange"],
			// RankRange: this.state.queryMap["rangeRange"],
			GameType: this.state.queryMap["gameType"],
			// Region: this.state.queryMap["region"],
		};
		return toQueryString(params);
	}

	fetchIncluded() {
		this.queryManager.fetch(
			"/analytics/query/card_included_popularity_report?" + this.getQueryParams(),
			(data) => this.setState({topCardsIncluded: this.state.topCardsIncluded.set(this.cacheKey(), data)})
		);
	}

	fetchPlayed() {
		this.queryManager.fetch(
			"/analytics/query/card_played_popularity_report?" + this.getQueryParams(),
			(data) => this.setState({topCardsPlayed: this.state.topCardsPlayed.set(this.cacheKey(), data)})
		);
	}
}
