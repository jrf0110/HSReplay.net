import * as React from "react";
import WinrateByTurnLineChart from "../components/charts/WinrateByTurnLineChart";
import CardDetailBarChart from "../components/charts/CardDetailBarChart";
import CardDetailGauge from "../components/charts/CardDetailGauge";
import CardDetailPieChart from "../components/charts/CardDetailPieChart";
import CardRankingTable from "../components/CardRankingTable";
import DeckList from "../components/DeckList";
import PopularityLineChart from "../components/charts/PopularityLineChart";
import WinrateLineChart from "../components/charts/WinrateLineChart";
import TurnPlayedBarChart from "../components/charts/TurnPlayedBarChart";
import {Colors} from "../Colors";
import {
	FilterData, Filter, FilterElement, FilterDefinition, KeyValuePair,
	Query, RenderData, ChartSeries, ChartSeriesMetaData, DataPoint,
	TableData, DeckObj
} from "../interfaces";
import HearthstoneJSON from "hearthstonejson";
import {
	toTitleCase, getChartScheme, setNames, toPrettyNumber, isWildCard, 
	isCollectibleCard, getColorString
} from "../helpers";
import QueryManager from "../QueryManager";

interface CardDetailState {
	card?: any;
	cardData?: Map<string, any>;
	cardsOnSameTurn?: TableData;
	classDistribution?: RenderData;
	popularTargets?: TableData;
	popularityByTurn?: RenderData;
	popularityOverTime?: RenderData;
	recommendedDecks?: TableData;
	winrateByTurn?: RenderData;
	winrateOverTime?: RenderData;
}

interface CardDetailProps extends React.ClassAttributes<CardDetail> {
	cardId: string;
	dbfId: number;
	isPremium: boolean;
}

export default class CardDetail extends React.Component<CardDetailProps, CardDetailState> {
	private readonly queryManager: QueryManager = new QueryManager();
	private readonly maxDecks = 20;

	constructor(props: CardDetailProps, state: CardDetailState) {
		super(props, state);
		this.state = {
			card: null,
			cardData: null,
			cardsOnSameTurn: "loading",
			classDistribution: "loading",
			popularTargets: "loading",
			popularityByTurn: "loading",
			popularityOverTime: "loading",
			recommendedDecks: "loading",
			winrateByTurn: "loading",
			winrateOverTime: "loading",
		}

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
			this.fetch(thisCard);
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
		let numMostCombinedRows = 8;
		let mostPopularTargets = null;
		if (this.cardHasTargetReqs()) {
			mostPopularTargets = [
				<h4>Most popular targets</h4>,
				<CardRankingTable
					cardData={this.state.cardData}
					numRows={8}
					tableData={this.state.popularTargets}
					dataKey={"ALL"}
					clickable
				/>
			];
		}
		else {
			numMostCombinedRows *= 2;
		}

		let classDistribution = null;
		let title = null;
		let content = null;
		if (this.state.card) {
			const set = this.state.card.set.toLowerCase();
			let replayCount = null;

			if (this.state.winrateOverTime !== "loading" && this.state.winrateOverTime !== "error") {
				replayCount = (
					<p className="pull-right">
						{"based on " + toPrettyNumber(this.state.winrateOverTime.series[0].metadata["num_data_points"]) + " replays"}
					</p>
				);
			}
		
			const cardNameStyle = {
				backgroundImage: "url(/static/images/set-icons/" + set + ".png"
			}

			title = [
				<h1 className="card-name" style={cardNameStyle}>{this.state.card.name}</h1>,
				<h4>{toTitleCase(this.state.card.playerClass) + " " + toTitleCase(this.state.card.type)}</h4>
			];

			if (!isCollectibleCard(this.state.card)) {
				content = (
					<div className="message-wrapper">
						<h3>Sorry, we currently don't have statistics for non-collectible cards.</h3>
						<a href="/cards/discover/">Check out our card database for card with available stats!</a>
					</div>
				);
			}
			else {
				if (this.cardIsNeutral()) {
					classDistribution = (
						<div className="class-chart">
							<CardDetailPieChart
								percent
								renderData={this.state.classDistribution}
								title={"Class Popularity"}
								scheme={getChartScheme("class")}
								textPrecision={2}
								sortByValue
								removeEmpty
							/>
						</div>
					);
				}

				content = [
					<div className="card-detail row">
						<div className="col-lg-6 col-md-6 col-sm-12 col-xs-12">
							<div className="chart-wrapper visible-xs">
								<PopularityLineChart
									renderData={this.state.popularityOverTime}
									widthRatio={2}
								/>
							</div>
							<div className="chart-wrapper hidden-lg">
								<WinrateLineChart
									renderData={this.state.winrateOverTime}
									widthRatio={2}
								/>
							</div>
							<div className="chart-wrapper">
								<TurnPlayedBarChart
									renderData={this.state.popularityByTurn}
									widthRatio={2}
								/>
							</div>
							<div className="chart-wrapper">
								<WinrateByTurnLineChart
									renderData={this.state.winrateByTurn}
									widthRatio={2}
								/>
							</div>
						</div>
						<div className="col-lg-6 col-md-6">
							<h4>Most combined with</h4>	
							<CardRankingTable
								cardData={this.state.cardData}
								numRows={numMostCombinedRows}
								tableData={this.state.cardsOnSameTurn}
								dataKey={"ALL"}
								clickable
							/>
							{mostPopularTargets}
						</div>
					</div>,
				]
			}
		}

		return <div className="card-detail-container">
			<div className="card-header" style={{backgroundImage: "url(https://art.hearthstonejson.com/v1/512x/" + this.props.cardId + ".jpg"}}>
				<div className="card-header-fade">
					<div className="row">
						<div className="col-title col-lg-4 col-md-6 col-sm-6 col-xs-12">
							<div className="page-title">
								{title}
							</div>
						</div>
						<div className="col-lg-4 col-md-6 col-sm-6 hidden-xs">
							<div className="chart-wrapper">
								<PopularityLineChart
									renderData={this.state.popularityOverTime}
									widthRatio={2}
								/>
							</div>
						</div>
						<div className="col-lg-4 hidden-md hidden-sm hidden-xs">
							<div className="chart-wrapper">
								<WinrateLineChart
									renderData={this.state.winrateOverTime}
									widthRatio={2}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="row">
				<div className="col-lg-4 col-md-4 col-sm-4 col-left">
					<img className="card-image" src={"http://media.services.zam.com/v1/media/byName/hs/cards/enus/" + this.props.cardId + ".png"} />
					<span></span>
					{classDistribution}
				</div>
				<div className="col-lg-8 col-md-8 col-sm-8 col-right">
					{content}
				</div>
			</div>
			<h3>Recommended Decks</h3>
			{this.buildRecommendedDecks()}
		</div>;
	}

	buildRecommendedDecks(): JSX.Element {
		if (!this.state.recommendedDecks || this.state.recommendedDecks === "loading" || this.state.recommendedDecks === "error") {
			return null;
		}

		if(!this.state.cardData) {
			return null;
		}
		
		const decks: DeckObj[] = [];
		const data = this.state.recommendedDecks.series.data;
		Object.keys(data).forEach(key => {
			data[key].forEach(deck => {
				const cards = JSON.parse(deck["deck_list"]);
				const cardData = cards.map(c => {return {card: this.state.cardData.get(''+c[0]), count: c[1]}});
				decks.push({
					cards: cardData,
					deckId: +deck["deck_id"],
					numGames: +deck["num_games"],
					playerClass: deck["player_class"],
					winrate: +deck["win_rate"]
				});
			})
		});

		return <DeckList decks={decks} pageSize={5} hideTopPager/>;
	}
	
	getBadgeColor(winrate: number) {
		const factor = winrate > 50 ? 4 : 3;
		const colorWinrate = 50 + Math.max(-50, Math.min(50, (factor * (winrate - 50))));
		return getColorString(Colors.REDGREEN4, 50, colorWinrate/100);
	}

	fetch(card: any) {
		if (!isCollectibleCard(card)) {
			return;
		}

		const buildUrl = (queryName: string, mode: string): string => {
			return "/analytics/query/" + queryName + "?card_id=" + this.props.dbfId + "&GameType=" + mode;
		}

		const mode = isWildCard(card) ? "RANKED_WILD" : "RANKED_STANDARD";

		if (this.cardIsNeutral(card)) {
			this.queryManager.fetch(
				buildUrl("single_card_class_distribution_by_include_count", mode),
				(data) => this.setState({classDistribution: data})
			);
		}

		if (this.cardHasTargetReqs(card)) {
			this.queryManager.fetch(
				buildUrl("single_card_popular_targets", mode),
				(data) => this.setState({popularTargets: data})
			);
		}

		this.queryManager.fetch(
			buildUrl("single_card_winrate_by_turn", mode),
			(data) => this.setState({winrateByTurn: data})
		);
		this.queryManager.fetch(
			buildUrl("single_card_include_popularity_over_time", mode),
			(data) => this.setState({popularityOverTime: data})
		);
		this.queryManager.fetch(
			buildUrl("single_card_winrate_over_time", mode),
			(data) => this.setState({winrateOverTime: data})
		);
		this.queryManager.fetch(
			buildUrl("single_card_popularity_by_turn", mode),
			(data) => this.setState({popularityByTurn: data})
		);
		this.queryManager.fetch(
			buildUrl("single_card_popular_together", mode),
			(data) => this.setState({cardsOnSameTurn: data})
		);
		this.queryManager.fetch(
			buildUrl("recommended_decks_for_card", mode),
			(data) => this.setState({recommendedDecks: data})
		);
	}
}
