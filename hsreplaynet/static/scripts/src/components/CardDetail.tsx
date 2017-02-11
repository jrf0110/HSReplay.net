import * as React from "react";
import WinrateByTurnLineChart from "./charts/WinrateByTurnLineChart";
import CardDetailBarChart from "./charts/CardDetailBarChart";
import CardDetailGauge from "./charts/CardDetailGauge";
import CardDetailPieChart from "./charts/CardDetailPieChart";
import CardDetailFilter from "./CardDetailFilter";
import CardDetailDecksList from "./charts/CardDetailDecksList";
import CardRankingTable from "./CardRankingTable";
import DeckTable from "./DeckTable";
import PopularityLineChart from "./charts/PopularityLineChart";
import WinrateLineChart from "./charts/WinrateLineChart";
import TurnPlayedBarChart from "./charts/TurnPlayedBarChart";
import TopCardsList from "./TopCardsList";
import ClassFilter from "./ClassFilter";
import {
	FilterData, Filter, FilterElement, FilterDefinition, KeyValuePair,
	Query, RenderData, ChartSeries, ChartSeriesMetaData, DataPoint,
	TableData
} from "../interfaces";
import HearthstoneJSON from "hearthstonejson";
import {toTitleCase, getChartScheme} from "../helpers";
import QueryManager from "../QueryManager";

interface CardDetailState {
	queries?: Query[];
	renders?: Map<string, RenderData>;
	filterData?: FilterData;
	selectedFilters?: Map<string, string>;
	queryTime?: Date;
	fetching?: boolean;
	cardData?: Map<string, any>;
	card?: any;
	classDistribution?: RenderData;
	winrateByTurn?: RenderData;
	popularityOverTime?: RenderData;
	winrateOverTime?: RenderData;
	popularityByTurn?: RenderData;
	cardsOnSameTurn?: TableData;
	popularTargets?: TableData;
	popularDecks?: TableData;
}

interface CardDetailProps extends React.ClassAttributes<CardDetail> {
	cardId: string;
	dbfId: number;
	isPremium: boolean;
}

export default class CardDetail extends React.Component<CardDetailProps, CardDetailState> {
	private readonly queryManager: QueryManager = new QueryManager();

	constructor(props: CardDetailProps, state: CardDetailState) {
		super(props, state);
		this.state = {
			queries: null,
			renders: new Map<string, RenderData>(),
			filterData: null,
			selectedFilters: new Map<string, string>(),
			queryTime: null,
			fetching: true,
			cardData: null,
			card: null,
		}

		this.fetchGeneric();

		new HearthstoneJSON().getLatest((data) => {
			const map = new Map<string, any>();
			let thisCard = null;
			data.forEach(card => {
				map.set(''+card.dbfId, card);
				if (card.id == this.props.cardId) {
					thisCard = card;
				}
			});
			this.setState({cardData: map, card: thisCard});
			this.fetchSpecific(thisCard);
		});
	}

	cardHasTargetReqs(card?: any): boolean {
		card = card || this.state.card;
		if (card && card.playRequirements) {
			return Object.keys(card.playRequirements).some(req => req.toLowerCase().indexOf("target") !== -1);
		}
		return false;
	}

	cardIsNeutral(card?: any): boolean {
		card = card || this.state.card;
		return card && card.playerClass === "NEUTRAL";
	}

	render(): JSX.Element {
		let mostPopularTargets = null;
		if (this.cardHasTargetReqs()) {
			mostPopularTargets = [
				<h4>Most popular targets</h4>,
				<CardRankingTable
					cardData={this.state.cardData}
					numRows={10}
					tableRows={this.state.popularTargets && this.state.popularTargets.series.data["ALL"]}
				/>
			];
		}

		let classDistribution = null;
		if (this.cardIsNeutral()) {
			classDistribution = (
				<div style={{maxWidth: "250px", margin: "0 auto"}}>
					<CardDetailPieChart
						percent
						series={this.state.classDistribution && this.state.classDistribution.series[0]}
						title={"Class Popularity"}
						scheme={getChartScheme("class")}
						textPrecision={2}
						sortByValue
						removeEmpty
					/>
				</div>
			);
		}

		return <div className="card-detail-container">
			<div className="row">
				<div className="col-lg-4" style={{textAlign: "center"}}>
					<img src={"http://media.services.zam.com/v1/media/byName/hs/cards/enus/" + this.props.cardId + ".png"} height="400px" />
					<div className="row">
					</div>
					<div className="btn-group" role="group">
						<button type="button" className="btn btn-primary">Standard</button>
						<button type="button" className="btn btn-default disabled">Wild</button>
						<button type="button" className="btn btn-default disabled">Arena</button>
					</div>
					{classDistribution}
				</div>
				<div className="col-lg-8">
					<h1 style={{paddingTop: "40px"}}>{this.state.card && this.state.card.name}</h1>
					<h5>{this.state.card && (toTitleCase(this.state.card.playerClass) + " " + toTitleCase(this.state.card.type))}</h5>
					<div className="row">
						<div className="col-lg-6 col-md-6">
							<PopularityLineChart
								series={this.state.popularityOverTime && this.state.popularityOverTime.series[0]}
								widthRatio={2}
							/>
						</div>
						<div className="col-lg-6 col-md-6">
							<WinrateLineChart
								series={this.state.winrateOverTime && this.state.winrateOverTime.series[0]}
								widthRatio={2}
							/>
						</div>
					</div>
					<div className="row">
						<div className="col-lg-6 col-md-6">
							<TurnPlayedBarChart
								series={this.state.popularityByTurn && this.state.popularityByTurn.series[0]}
								widthRatio={2}
							/>
						</div>
						<div className="col-lg-6 col-md-6">
							<WinrateByTurnLineChart
								series={this.state.winrateByTurn && this.state.winrateByTurn.series[0]}
								widthRatio={2}
							/>
						</div>
					</div>
					<div className="row">
						<div className="col-lg-6 col-md-6">
							<h4>Top Decks</h4>	
							<DeckTable
								cardData={this.state.cardData}
								numRows={10}
								tableSeries={this.state.popularDecks && this.state.popularDecks.series.data}
							/>
						</div>
						<div className="col-lg-6 col-md-6">
							<h4>Top cards played on same turn</h4>	
							<CardRankingTable
								cardData={this.state.cardData}
								numRows={10}
								tableRows={this.state.cardsOnSameTurn && this.state.cardsOnSameTurn.series.data["ALL"]}
								clickable
							/>
							{mostPopularTargets}
						</div>
					</div>
				</div>
			</div>
		</div>;
	}

	// fetchFilters(): void {
	// 	fetch("https://dev.hsreplay.net/analytics/filters", {
	// 		credentials: "include",
	// 	}).then((response) => {
	// 		return response.json();
	// 	}).then((json: any) => {
	// 		const defaultFilters = new Map<string, string>();
	// 		const data = json as FilterData;
	// 		data.filters.forEach(filter => {
	// 			defaultFilters.set(filter.name, filter.elements.find(x => x.is_default).name);
	// 		})
	// 		defaultFilters.set("TimeRange", "CURRENT_SEASON");
	// 		this.setState({filterData: json, selectedFilters: defaultFilters})
	// 		this.fetchQueries();
	// 	});
	// }

	// fetchQueries(): void {
	// 	fetch("https://dev.hsreplay.net/analytics/inventory/card/" + this.props.cardId, {
	// 		credentials: "include",
	// 	}).then((response) => {
	// 		return response.json();
	// 	}).then((json: any) => {
	// 		console.log("received queries for", this.props.cardId, ":", json.map(x => x.endpoint));
	// 		this.state.queries = json;
	// 		this.setState({fetching: true, queryTime: new Date()})
	// 		this.state.queries.filter(x => x.avg_query_duration_seconds).forEach(query => {
	// 			this.fetchQuery(query);
	// 		})
	// 		this.state.queries.filter(x => !x.avg_query_duration_seconds).forEach(query => {
	// 			this.fetchQuery(query);
	// 		})
	// 	});
	// }

	// fetchQuery(query: Query): void {
	// 	if (query.endpoint === "/analytics/query/single_card_winrate_when_drawn_by_turn") {
	// 		console.warn("SKIPPING", query.endpoint)
	// 		return;
	// 	}
	// 	let url = "https://dev.hsreplay.net" + query.endpoint + "?"
	// 		+ query.params.map(param => param+ "=" + this.resolveParam(param))
	// 			.reduce((prev, curr) => prev + "&" + curr);
	// 	console.log("Fetching", query.endpoint);
	// 	fetch(url, {
	// 		credentials: "include"
	// 	}).then((response) => {
	// 		return response.json();
	// 	}).then((json: any) => {
	// 		this.setState({
	// 			renders: this.state.renders.set(query.endpoint, json),
	// 			fetching: false
	// 		});
	// 	}).catch(() => {
	// 		this.setState({fetching: false})
	// 	});
	// }

	fetchGeneric() {
		this.queryManager.fetch(
			"/analytics/query/single_card_winrate_by_turn?card_id=" + this.props.dbfId + "&TimeRange=LAST_1_DAY&RankRange=ALL&GameType=RANKED_STANDARD",
			(success, json) => this.setState({winrateByTurn: json})
		);
		this.queryManager.fetch(
			"/analytics/query/single_card_include_popularity_over_time?card_id=" + this.props.dbfId + "&TimeRange=LAST_14_DAYS&RankRange=ALL&GameType=RANKED_STANDARD",
			(success, json) => this.setState({popularityOverTime: json})
		);
		this.queryManager.fetch(
			"/analytics/query/single_card_winrate_over_time?card_id=" + this.props.dbfId + "&TimeRange=LAST_14_DAYS&RankRange=ALL&GameType=RANKED_STANDARD",
			(success, json) => this.setState({winrateOverTime: json})
		);
		this.queryManager.fetch(
			"/analytics/query/single_card_popularity_by_turn?card_id=" + this.props.dbfId + "&TimeRange=LAST_1_DAY&RankRange=ALL&GameType=RANKED_STANDARD",
			(success, json) => this.setState({popularityByTurn: json})
		);
		this.queryManager.fetch(
			"/analytics/query/single_card_popular_together?card_id=" + this.props.dbfId + "&TimeRange=LAST_1_DAY&RankRange=ALL&GameType=RANKED_STANDARD",
			(success, json) => this.setState({cardsOnSameTurn: json})
		);
	}
	
	fetchSpecific(card: any) {
		if (this.cardIsNeutral(card)) {
			this.queryManager.fetch(
				"/analytics/query/single_card_class_distribution_by_include_count?card_id=" + this.props.dbfId + "&TimeRange=LAST_1_DAY&RankRange=ALL&GameType=RANKED_STANDARD",
				(success, json) => this.setState({classDistribution: json})
			);
			this.queryManager.fetch(
				"/analytics/query/neutral_card_top_decks_when_played?card_id=" + this.props.dbfId + "&TimeRange=LAST_1_DAY&RankRange=ALL&GameType=RANKED_STANDARD",
				(success, json) => this.setState({popularDecks: json})
			);
		}
		else {
			this.queryManager.fetch(
				"/analytics/query/class_card_top_decks_when_played?card_id=" + this.props.dbfId + "&TimeRange=LAST_1_DAY&RankRange=ALL&GameType=RANKED_STANDARD",
				(success, json) => this.setState({popularDecks: json})
			);
		}
		if (this.cardHasTargetReqs(card)) {
			this.queryManager.fetch(
				"/analytics/query/single_card_popular_targets?card_id=" + this.props.dbfId + "&TimeRange=LAST_1_DAY&RankRange=ALL&GameType=RANKED_STANDARD",
				(success, json) => this.setState({popularTargets: json})
			);
		}
	}

	// resolveParam(param: string): string {
	// 	if (param === "card_id") {
	// 		return this.props.cardId;
	// 	}
	// 	return this.state.selectedFilters.get(param);
	// }
}
