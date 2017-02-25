import * as React from "react";
import CardDetailPieChart from "../components/charts/CardDetailPieChart";
import CardRankingTable from "../components/CardRankingTable";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import PremiumWrapper from "../components/PremiumWrapper";
import QueryManager from "../QueryManager";
import ResetHeader from "../components/ResetHeader";
import { TableData, TableQueryData, ChartSeries } from "../interfaces";
import {
	QueryMap, getQueryMapFromLocation, queryMapHasChanges,
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
	userIsPremium: boolean;
}

export default class PopularCards extends React.Component<PopularCardsProps, PopularCardsState> {
	private readonly queryManager: QueryManager = new QueryManager();
	private readonly defaultQueryMap: QueryMap = {
		gameType: "RANKED_STANDARD",
		playerClass: "ALL",
		rankRange: "ALL",
		timeRange: "LAST_14_DAYS",
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
		timeRange: ["LAST_3_DAYS", "LAST_7_DAYS", "LAST_14_DAYS"],
	}

	constructor(props: PopularCardsProps, state: PopularCardsState) {
		super(props, state);
		this.state = {
			numRowsVisible: 12,
			queryMap: getQueryMapFromLocation(this.defaultQueryMap, this.getAllowedValues()),
			showFilters: false,
			topCardsIncluded: new Map<string, TableData>(),
			topCardsPlayed: new Map<string, TableData>(),
		}

		this.fetchIncluded();
		this.fetchPlayed();
	}

	getAllowedValues(): any {
		return this.props.userIsPremium ? this.allowedValuesPremium : this.allowedValues;
	}

	cacheKey(state?: PopularCardsState): string {
		const allowedValues = this.getAllowedValues();
		const queryMap = (state || this.state).queryMap;
		const cacheKey = [];
		Object.keys(allowedValues).forEach(key => {
			const value = allowedValues[key];
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
		const filterClassNames = ["infobox full-sm"];
		const contentClassNames = ["report-content container-fluid"]
		if (!this.state.showFilters) {
			filterClassNames.push("hidden-xs hidden-sm");
		}
		else {
			contentClassNames.push("hidden-xs hidden-sm");
		}
		
		return <div className="report-container" id="card-popularity-report">
			<div className={filterClassNames.join(" ")}>
				{this.buildFilters()}
			</div>
			<div className={contentClassNames.join(" ")}>
				{this.buildContent()}
			</div>
		</div>;
	}

	buildContent(): JSX.Element[] {
		const played = this.state.topCardsPlayed.get(this.cacheKey());
		const included = this.state.topCardsIncluded.get(this.cacheKey());

		if (!played || !included || played === "loading" || included === "loading" || !this.props.cardData) {
			return [
				<div className="content-message">
					<h2>Counting cards...</h2>
				</div>
			];
		}
		else if (played === "error" || included === "error") {
			return [
				<div className="content-message">
					<h2>Alright, working on it...</h2>
					Please check back later.
				</div>
			];
		}
		else {
			return [
				<button className="btn btn-default visible-xs visible-sm" type="button" onClick={() => this.setState({showFilters: true})}>
					<span className="glyphicon glyphicon-filter"/>
					Filters
				</button>,
				<div className ="row">
					{this.buildCharts(included)}
				</div>,
				<div className="row">
					{this.buildTables(played, included)}
				</div>,
				<div className="row" id="button-show-more">
					{this.showMoreButton()}
				</div>
			];
		}
	}

	buildFilters(): JSX.Element[] {
		const backButton = (
			<button className="btn btn-primary btn-full visible-sm visible-xs" type="button" onClick={() => this.setState({showFilters: false})}>
				Back to the exhibition
			</button>
		);

		return [
			backButton,
			<ResetHeader onReset={() => this.setState({queryMap: this.defaultQueryMap})} showReset={queryMapHasChanges(this.state.queryMap, this.defaultQueryMap)}>
				Card Menagerie
			</ResetHeader>,
			<h2>Class</h2>,
			<ClassFilter 
				hideAll
				multiSelect={false}
				filters="All"
				minimal
				selectedClasses={[this.state.queryMap["playerClass"] as FilterOption]}
				selectionChanged={(selected) => setQueryMap(this, "playerClass", selected[0])}
			/>,
			<h2>Mode</h2>,
			<InfoboxFilterGroup selectedValue={this.state.queryMap["gameType"]} onClick={(value) => setQueryMap(this, "gameType", value)}>
				<InfoboxFilter value="RANKED_STANDARD">Standard</InfoboxFilter>
				<InfoboxFilter value="RANKED_WILD">Wild</InfoboxFilter>
				<InfoboxFilter value="ARENA">Arena</InfoboxFilter>
			</InfoboxFilterGroup>,
			<PremiumWrapper isPremium={this.props.userIsPremium}>
				<h2>Time frame</h2>
				<InfoboxFilterGroup selectedValue={this.state.queryMap["timeRange"]} onClick={(value) => setQueryMap(this, "timeRange", value)}>
					<InfoboxFilter value="LAST_3_DAYS">Last 3 days</InfoboxFilter>
					<InfoboxFilter value="LAST_7_DAYS">Last 7 days</InfoboxFilter>
					<InfoboxFilter value="LAST_14_DAYS">Last 14 days</InfoboxFilter>
				</InfoboxFilterGroup>
			</PremiumWrapper>,
			<PremiumWrapper isPremium={this.props.userIsPremium}>
				<h2>Rank range</h2>
				<InfoboxFilterGroup deselectable selectedValue={this.state.queryMap["rankRange"]} onClick={(value) => setQueryMap(this, "rankRange", value)}>
					<InfoboxFilter value="LEGEND_THROUGH_TEN">Legend - 10</InfoboxFilter>
				</InfoboxFilterGroup>
			</PremiumWrapper>,
			backButton
		];
	}

	showMoreButton(): JSX.Element {
		if (this.state.numRowsVisible >= 100) {
			return null;
		}
		return (
			<button className="btn btn-default"
				type="button"
				onClick={() => this.setState({numRowsVisible: Math.max(15, this.state.numRowsVisible) * 2})}>
				{"Show more..."}
			</button>
		);
	}

	buildTables(topCardsPlayed: TableData, topCardsIncluded: TableData): JSX.Element[] {
		const selectedClass = this.state.queryMap["playerClass"];
		return [
			<div className="col-lg-6 col-md-6 col-sm-12 col-xs-12">
				<h2>Most included cards</h2>
				<div>
					<CardRankingTable 
						cardData={this.props.cardData}
						clickable
						dataKey={selectedClass}
						numRows={this.state.numRowsVisible}
						tableData={topCardsIncluded}
					/>
				</div>
			</div>,
			<div className="col-lg-6 col-md-6 col-sm-12 col-xs-12">
				<h2>Most played cards</h2>
				<div>
					<CardRankingTable 
						cardData={this.props.cardData}
						clickable
						dataKey={selectedClass}
						numRows={this.state.numRowsVisible}
						tableData={topCardsPlayed}
					/>
				</div>
			</div>
		];
	}

	buildCharts(data: TableQueryData): JSX.Element[] {
		const chartSeries = this.buildChartSeries(data);
		return [
			<div className="chart-column col-lg-3 col-md-3 col-sm-6 col-xs-6">
				<div className="chart-wrapper">
					<CardDetailPieChart percent title="Rarity" renderData={chartSeries.length ? {series: [chartSeries[0]]} : "loading"}/>
				</div>
			</div>,
			<div className="chart-column col-lg-3 col-md-3 col-sm-6 col-xs-6">
				<div className="chart-wrapper">
					<CardDetailPieChart percent title="Type" renderData={chartSeries.length ? {series: [chartSeries[1]]} : "loading"}/>
				</div>
			</div>,
			<div className="chart-column col-lg-3 col-md-3 col-sm-6 col-xs-6">
				<div className="chart-wrapper">
					<CardDetailPieChart percent title="Set" renderData={chartSeries.length ? {series: [chartSeries[2]]} : "loading"}/>
				</div>
			</div>,
			<div className="chart-column col-lg-3 col-md-3 col-sm-6 col-xs-6">
				<div className="chart-wrapper">
					<CardDetailPieChart percent title="Cost" renderData={chartSeries.length ? {series: [chartSeries[3]]} : "loading"}/>
				</div>
			</div>
		];
	}

	buildChartSeries(topCardsIncluded: TableQueryData): ChartSeries[] {
		const chartSeries = [];
		if (this.props.cardData && this.state.topCardsIncluded) {
			const selectedClass = this.state.queryMap["playerClass"];
			const rows = topCardsIncluded.series.data[selectedClass];
			const data = {rarity: {}, cardtype: {}, cardset: {}, cost: {}};
			const totals = {rarity: 0, cardtype: 0, cardset: 0, cost: 0};
			rows.forEach(row => {
				const card = this.props.cardData.get(""+row["dbf_id"])
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
			TimeRange: this.state.queryMap["timeRange"] || this.defaultQueryMap["timeRange"],
			RankRange: this.state.queryMap["rankRange"] || this.defaultQueryMap["rankRange"],
			GameType: this.state.queryMap["gameType"] || this.defaultQueryMap["gameType"],
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
