import * as React from "react";
import CardData from "../CardData";
import CardDetailPieChart from "../components/charts/CardDetailPieChart";
import CardRankingTable from "../components/CardRankingTable";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import PremiumWrapper from "../components/PremiumWrapper";
import QueryManager from "../QueryManager";
import ResetHeader from "../components/ResetHeader";
import {TableData, TableQueryData, ChartSeries} from "../interfaces";
import {
	QueryMap,
	genCacheKey,
	getQueryMapFromLocation,
	queryMapHasChanges,
	setLocationQueryString,
	setQueryMap,
	toQueryString,
	getQueryMapDiff
} from "../QueryParser";
import TourManager from "../TourManager";

interface PopularCardsState {
	numRowsVisible?: number;
	queryMap?: QueryMap;
	showFilters?: boolean;
	topCardsIncluded?: Map<string, TableData>;
	topCardsPlayed?: Map<string, TableData>;
}

interface PopularCardsProps extends React.ClassAttributes<PopularCards> {
	cardData: CardData;
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
		timeRange: ["LAST_1_DAY", "LAST_3_DAYS", "LAST_7_DAYS", "LAST_14_DAYS"],
	}

	constructor(props: PopularCardsProps, state: PopularCardsState) {
		super(props, state);
		this.state = {
			numRowsVisible: 12,
			queryMap: getQueryMapFromLocation(this.defaultQueryMap, this.getAllowedValues()),
			showFilters: false,
			topCardsIncluded: new Map<string, TableData>(),
			topCardsPlayed: new Map<string, TableData>(),
		};

		this.fetchIncluded();
		this.fetchPlayed();
	}

	getAllowedValues(): any {
		return this.props.userIsPremium ? this.allowedValuesPremium : this.allowedValues;
	}

	componentDidUpdate(prevProps: PopularCardsProps, prevState: PopularCardsState) {
		const cacheKey = genCacheKey(this, );
		const prevCacheKey = genCacheKey(this, prevState);
		const includedCards = this.state.topCardsIncluded.get(cacheKey);
		const playedCards = this.state.topCardsPlayed.get(cacheKey);
		if (cacheKey !== prevCacheKey) {
			if (!includedCards|| includedCards === "error") {
				this.fetchIncluded();
			}

			if (!playedCards || playedCards === "error") {
				this.fetchPlayed();
			}
		}
		setLocationQueryString(this.state.queryMap, this.defaultQueryMap);
	}

	componentDidMount() {
		this.createTour(false);
	}

	createTour(force?: boolean) {
		const tour = new TourManager();
		tour.createTour("popular_cards", [
			{
				id: "welcome",
				title: "Introduction",
				text: [
					"Welcome to Top Cards! Here you can learn all about the most popular cards in Hearthstone.",
					"",
					"Take a short tour through the statistics displayed on this page and how you can adjust them.",
				],
			},
			{
				id: "most-included",
				title: "Highest inclusion rate",
				text: [
					"These tables show you the cards that have been included in the most decks and the ones that have been played the most.",
				],
				attachTo: "#tables-row top",
			},
			{
				id: "show-more-button",
				title: "More cards",
				text: "Expand the card list by clicking on this button.",
				attachTo: "#show-more-button top",
			},
			{
				id: "charts",
				title: "Charts",
				text: [
					"These charts correspond to the tables below and show you various details about the cards below.",
					"",
					"Hover over the diagrams to see which color corresponds to what.",
				],
				attachTo: "#charts-row bottom",
			},
			{
				id: "class-filter",
				title: "Pick a class",
				text: [
					"Select a class by clicking on it's symbol.",
					"The charts and tables will instantly update and only show the cards in decks of and played by the selected class.",
				],
				attachTo: "#class-filter right",
			},
			{
				id: "mode-filter",
				title: "Choose your game mode",
				text: [
					"Not interested in Ranked Standard?",
					"Select your preferred game mode here.",
				],
				attachTo: "#mode-filter right",
			},
			{
				id: "card-details",
				title: "Card Details",
				text: "Click on any card to leave this page and view in-depth statistics about that card.",
				attachTo: () => {
					const cards = document.getElementsByClassName("card-wrapper");
					const card = cards.length ? cards[0] : null;
					const element = card ? card.firstChild : null;
					return {
						element: element,
						on: "top",
					};
				}
			},
		], null, force);
	}

	render(): JSX.Element {
		const filterClassNames = ["infobox full-sm"];
		const contentClassNames = ["report-content container-fluid"];
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
		const played = this.state.topCardsPlayed.get(genCacheKey(this));
		const included = this.state.topCardsIncluded.get(genCacheKey(this));

		if (!played || !included || played === "loading" || included === "loading" || !this.props.cardData) {
			return [
				<div className="content-message">
					<h2>Counting cards…</h2>
				</div>
			];
		}
		else if (played === "error" || included === "error") {
			console.log(played, included);
			return [
				<div className="content-message">
					<h2>Something went wrong</h2>
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
				<div className ="row" id="charts-row">
					{this.buildCharts(included)}
				</div>,
				<div className="row" id="tables-row">
					{this.buildTables(played, included)}
				</div>,
				<div className="row text-center">
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
				Top Cards
			</ResetHeader>,
			<section id="class-filter">
				<h2>Class</h2>
				<ClassFilter
					hideAll
					multiSelect={false}
					filters="All"
					minimal
					selectedClasses={[this.state.queryMap["playerClass"] as FilterOption]}
					selectionChanged={(selected) => setQueryMap(this, "playerClass", selected[0])}
				/>
			</section>,
			<section id="mode-filter">
				<h2>Mode</h2>
				<InfoboxFilterGroup selectedValue={this.state.queryMap["gameType"]} onClick={(value) => setQueryMap(this, "gameType", value)}>
					<InfoboxFilter value="RANKED_STANDARD">Ranked Standard</InfoboxFilter>
					<InfoboxFilter value="RANKED_WILD">Ranked Wild</InfoboxFilter>
					<InfoboxFilter value="ARENA">Arena</InfoboxFilter>
				</InfoboxFilterGroup>
			</section>,
			<PremiumWrapper
				isPremium={this.props.userIsPremium}
				infoHeader="Time frame"
				infoContent="Get the most recent data on what cards are hot right now!"
			>
				<h2>Time frame</h2>
				<InfoboxFilterGroup locked={!this.props.userIsPremium} selectedValue={this.state.queryMap["timeRange"]} onClick={(value) => setQueryMap(this, "timeRange", value)}>
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
				<h2>Rank range</h2>
				<InfoboxFilterGroup locked={!this.props.userIsPremium} selectedValue={this.state.queryMap["rankRange"]} onClick={(value) => setQueryMap(this, "rankRange", value)}>
					<InfoboxFilter value="LEGEND_THROUGH_TEN">Legend–10</InfoboxFilter>
					<InfoboxFilter value="ALL">Legend–25</InfoboxFilter>
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
			<button
				id="show-more-button"
				className="btn btn-default"
				type="button"
				onClick={() => this.setState({numRowsVisible: Math.max(15, this.state.numRowsVisible) * 2})}>
				{"Show more…"}
			</button>
		);
	}

	buildTables(topCardsPlayed: TableData, topCardsIncluded: TableData): JSX.Element[] {
		const selectedClass = this.state.queryMap["playerClass"];
		return [
			<div id="most-included-cards" className="col-lg-6 col-md-6 col-sm-12 col-xs-12">
				<h2>Most included cards</h2>
				<div>
					<CardRankingTable
						cardData={this.props.cardData}
						clickable
						dataKey={selectedClass}
						numRows={this.state.numRowsVisible}
						tableData={topCardsIncluded}
						urlGameType={getQueryMapDiff(this.state.queryMap, this.defaultQueryMap).gameType}
					/>
				</div>
			</div>,
			<div id="most-played-cards" className="col-lg-6 col-md-6 col-sm-12 col-xs-12">
				<h2>Most played cards</h2>
				<div>
					<CardRankingTable
						cardData={this.props.cardData}
						clickable
						dataKey={selectedClass}
						numRows={this.state.numRowsVisible}
						tableData={topCardsPlayed}
						urlGameType={getQueryMapDiff(this.state.queryMap, this.defaultQueryMap).gameType}
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
					<CardDetailPieChart title="Rarity" renderData={chartSeries.length ? {series: [chartSeries[0]]} : "loading"}/>
				</div>
			</div>,
			<div className="chart-column col-lg-3 col-md-3 col-sm-6 col-xs-6">
				<div className="chart-wrapper">
					<CardDetailPieChart title="Type" renderData={chartSeries.length ? {series: [chartSeries[1]]} : "loading"}/>
				</div>
			</div>,
			<div className="chart-column col-lg-3 col-md-3 col-sm-6 col-xs-6">
				<div className="chart-wrapper">
					<CardDetailPieChart title="Set" renderData={chartSeries.length ? {series: [chartSeries[2]]} : "loading"}/>
				</div>
			</div>,
			<div className="chart-column col-lg-3 col-md-3 col-sm-6 col-xs-6">
				<div className="chart-wrapper">
					<CardDetailPieChart title="Cost" renderData={chartSeries.length ? {series: [chartSeries[3]]} : "loading"}/>
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
				const card = this.props.cardData.fromDbf(row["dbf_id"]);
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
		const cacheKey = genCacheKey(this);
		this.queryManager.fetch(
			"/analytics/query/card_included_popularity_report?" + this.getQueryParams(),
			(data) => this.setState({topCardsIncluded: this.state.topCardsIncluded.set(cacheKey, data)})
		);
	}

	fetchPlayed() {
		const cacheKey = genCacheKey(this);
		this.queryManager.fetch(
			"/analytics/query/card_played_popularity_report?" + this.getQueryParams(),
			(data) => this.setState({topCardsPlayed: this.state.topCardsPlayed.set(cacheKey, data)})
		);
	}
}
