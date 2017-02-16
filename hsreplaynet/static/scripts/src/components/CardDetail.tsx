import * as React from "react";
import WinrateByTurnLineChart from "./charts/WinrateByTurnLineChart";
import CardDetailBarChart from "./charts/CardDetailBarChart";
import CardDetailGauge from "./charts/CardDetailGauge";
import CardDetailPieChart from "./charts/CardDetailPieChart";
import CardRankingTable from "./CardRankingTable";
import PopularityLineChart from "./charts/PopularityLineChart";
import WinrateLineChart from "./charts/WinrateLineChart";
import TurnPlayedBarChart from "./charts/TurnPlayedBarChart";
import TopCardsList from "./TopCardsList";
import ClassFilter from "./ClassFilter";
import {Colors} from "../Colors";
import {
	FilterData, Filter, FilterElement, FilterDefinition, KeyValuePair,
	Query, RenderData, ChartSeries, ChartSeriesMetaData, DataPoint,
	TableData
} from "../interfaces";
import HearthstoneJSON from "hearthstonejson";
import {
	toTitleCase, getChartScheme, setNames, toPrettyNumber, isWildCard, 
	isCollectibleCard, getColorString
} from "../helpers";
import QueryManager from "../QueryManager";

interface CardDetailState {
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
	private readonly maxDecks = 20;

	constructor(props: CardDetailProps, state: CardDetailState) {
		super(props, state);
		this.state = {
			cardData: null,
			card: null,
			classDistribution: "loading",
			winrateByTurn: "loading",
			popularityOverTime: "loading",
			winrateOverTime: "loading",
			popularityByTurn: "loading",
			cardsOnSameTurn: "loading",
			popularTargets: "loading",
			popularDecks: "loading",
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
		let mostPopularTargets = null;
		if (this.cardHasTargetReqs()) {
			mostPopularTargets = [
				<h3>Most popular targets</h3>,
				<CardRankingTable
					cardData={this.state.cardData}
					numRows={10}
					tableData={this.state.popularTargets}
					dataKey={"ALL"}
					clickable
				/>
			];
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

			title = [
					<img src={STATIC_URL + "images/set-icons/" + set + ".png"} title={setNames[set]}/>,
					<div>
						<h1>{this.state.card.name}</h1>
						{toTitleCase(this.state.card.playerClass) + " " + toTitleCase(this.state.card.type)}
						{replayCount}
					</div>
			];

			if (isWildCard(this.state.card)) {
				content = (
					<div className="message-wrapper">
						<h3>Sorry, we currently don't have statistics for wild cards.</h3>
						<p>But we are working on it, please check back later!</p>
						<a href="/cards/discover/">In the mean time, check out our card database for card with available stats!</a>
					</div>
				);
			}
			else if (!isCollectibleCard(this.state.card)) {
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
					<div className="row">
						<div className="col-lg-6 col-md-6">
							<PopularityLineChart
								renderData={this.state.popularityOverTime}
								widthRatio={2}
							/>
						</div>
						<div className="col-lg-6 col-md-6">
							<WinrateLineChart
								renderData={this.state.winrateOverTime}
								widthRatio={2}
							/>
						</div>
					</div>,
					<div className="row">
						<div className="col-lg-6 col-md-6">
							<TurnPlayedBarChart
								renderData={this.state.popularityByTurn}
								widthRatio={2}
							/>
						</div>
						<div className="col-lg-6 col-md-6">
							<WinrateByTurnLineChart
								renderData={this.state.winrateByTurn}
								widthRatio={2}
							/>
						</div>
					</div>,
					<div className="row">
						<div className="col-lg-6 col-md-6">
							<h3>Most combined with</h3>	
							<CardRankingTable
								cardData={this.state.cardData}
								numRows={10}
								tableData={this.state.cardsOnSameTurn}
								dataKey={"ALL"}
								clickable
							/>
						</div>
						<div className="col-lg-6 col-md-6">
							{mostPopularTargets}
						</div>
					</div>
				]
			}
		}


		return <div className="card-detail-container">
			<div className="row">
				<div className="col-lg-3 col-md-4 col-sm-5 col-left">
					<img className="card-image" src={"http://media.services.zam.com/v1/media/byName/hs/cards/enus/" + this.props.cardId + ".png"} />
					{classDistribution}
					{this.buildDecksList()}
				</div>
				<div className="col-lg-9 col-md-8 col-sm-7 col-right">
					<div className="page-title">
						{title}
					</div>
					{content}
				</div>
			</div>
		</div>;
	}

	buildDecksList(): JSX.Element {
		if (this.state.popularDecks === "error" || this.state.popularDecks === "loading") {
			return null;
		}

		const rows = [];
		const playerClasses = [];
		let foundAny = false;
		let index = 0;
		do {
			foundAny = false;
			const series = this.state.popularDecks.series;
			Object.keys(series.data).forEach(key => {
				const data = series.data[key][index];
				if (data) {
					foundAny = true;
					rows.push(data);
					if (playerClasses.indexOf(data["player_class"]) === -1) {
						playerClasses.push(data["player_class"]);
					}
				}
			});
			index++;
		}
		while (foundAny && rows.length < this.maxDecks);

		rows.sort((a, b) => +a["win_rate"] < +b["win_rate"] ? 1 : -1);
		playerClasses.sort();

		const decksList = [];
		playerClasses.forEach(pClass => {
			const decks = [];

			decksList.push(
				<span className="pull-right">Winrate</span>,
				<h4>{toTitleCase(pClass)}</h4>
			);

			rows.filter(row => row["player_class"] === pClass).forEach(row => {
				const winrate = +row["win_rate"];
				decks.push(
					<li>
						<a href={"/cards/decks/" + row["deck_id"]}>
							{pClass}
							<span className="badge" style={{background: this.getBadgeColor(winrate)}}>{winrate + "%"}</span>
						</a>
					</li>
				);
			});

			decksList.push(<ul>{decks}</ul>);
		});

		return (
			<div className="deck-list">
				<h3>Hottest decks</h3>
				{decksList}
			</div>
		);
	}
	
	getBadgeColor(winrate: number) {
		const factor = winrate > 50 ? 4 : 3;
		const colorWinrate = 50 + Math.max(-50, Math.min(50, (factor * (winrate - 50))));
		return getColorString(Colors.REDGREEN4, 50, colorWinrate/100);
	}

	fetch(card: any) {
		if (isWildCard(card) || !isCollectibleCard(card)) {
			return;
		}
		if (this.cardIsNeutral(card)) {
			this.queryManager.fetch(
				"/analytics/query/single_card_class_distribution_by_include_count?card_id=" + this.props.dbfId + "&TimeRange=LAST_1_DAY&RankRange=ALL&GameType=RANKED_STANDARD",
				(data) => this.setState({classDistribution: data})
			);
			this.queryManager.fetch(
				"/analytics/query/neutral_card_top_decks_when_played?card_id=" + this.props.dbfId + "&TimeRange=LAST_1_DAY&RankRange=ALL&GameType=RANKED_STANDARD",
				(data) => this.setState({popularDecks: data})
			);
		}
		else {
			this.queryManager.fetch(
				"/analytics/query/class_card_top_decks_when_played?card_id=" + this.props.dbfId + "&TimeRange=LAST_1_DAY&RankRange=ALL&GameType=RANKED_STANDARD",
				(data) => this.setState({popularDecks: data})
			);
		}
		if (this.cardHasTargetReqs(card)) {
			this.queryManager.fetch(
				"/analytics/query/single_card_popular_targets?card_id=" + this.props.dbfId + "&TimeRange=LAST_1_DAY&RankRange=ALL&GameType=RANKED_STANDARD",
				(data) => this.setState({popularTargets: data})
			);
		}

		this.queryManager.fetch(
			"/analytics/query/single_card_winrate_by_turn?card_id=" + this.props.dbfId + "&TimeRange=LAST_1_DAY&RankRange=ALL&GameType=RANKED_STANDARD",
			(data) => this.setState({winrateByTurn: data})
		);
		this.queryManager.fetch(
			"/analytics/query/single_card_include_popularity_over_time?card_id=" + this.props.dbfId + "&TimeRange=LAST_14_DAYS&RankRange=ALL&GameType=RANKED_STANDARD",
			(data) => this.setState({popularityOverTime: data})
		);
		this.queryManager.fetch(
			"/analytics/query/single_card_winrate_over_time?card_id=" + this.props.dbfId + "&TimeRange=LAST_14_DAYS&RankRange=ALL&GameType=RANKED_STANDARD",
			(data) => this.setState({winrateOverTime: data})
		);
		this.queryManager.fetch(
			"/analytics/query/single_card_popularity_by_turn?card_id=" + this.props.dbfId + "&TimeRange=LAST_1_DAY&RankRange=ALL&GameType=RANKED_STANDARD",
			(data) => this.setState({popularityByTurn: data})
		);
		this.queryManager.fetch(
			"/analytics/query/single_card_popular_together?card_id=" + this.props.dbfId + "&TimeRange=LAST_1_DAY&RankRange=ALL&GameType=RANKED_STANDARD",
			(data) => this.setState({cardsOnSameTurn: data})
		);
	}
	
}
