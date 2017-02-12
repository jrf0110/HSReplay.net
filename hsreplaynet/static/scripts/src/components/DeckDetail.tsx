import * as React from "react";
import DeckList from "./DeckList";
import HearthstoneJSON from "hearthstonejson";
import {TableData, TableRow, ChartSeries, RenderData} from "../interfaces";
import CardTile from "./CardTile";
import ClassFilter from "./ClassFilter";
import CardDetailPieChart from "./charts/CardDetailPieChart";
import CardDetailGauge from "./charts/CardDetailGauge";
import CardDetailLineChart from "./charts/CardDetailLineChart";
import CardDetailBarChart from "./charts/CardDetailBarChart";
import WinrateLineChart from "./charts/WinrateLineChart";
import PopularityLineChart from "./charts/PopularityLineChart";
import {getChartScheme, toPrettyNumber, toTitleCase} from "../helpers";
import QueryManager from "../QueryManager";

interface Card {
	cardObj: any;
	count: number;
}

interface DeckDetailState {
	deck?: any;
	cardData?: Map<string, any>;
	selectedClasses?: Map<string, boolean>;
	tableDataAll?: TableData;
	tableDataClasses?: TableData;
	averageDuration?: RenderData;
	winrateOverTime?: RenderData;
	popularityOverTime?: RenderData;
	similarDecks?: TableData;
}

interface DeckDetailProps extends React.ClassAttributes<DeckDetail> {
	deckId: number;
	deckCards: string;
	deckClass: string;
	deckName?: string;
}

export default class DeckDetail extends React.Component<DeckDetailProps, DeckDetailState> {
	private readonly queryManager: QueryManager = new QueryManager();

	constructor(props: DeckDetailProps, state: DeckDetailState) {
		super(props, state);
		this.state = {
			deck: null,
			cardData: null,
			selectedClasses: null,
			tableDataAll: null,
			tableDataClasses: null,
			popularityOverTime: null,
			similarDecks: null,
		}

		this.fetch();

		new HearthstoneJSON().getLatest((data) => {
			const map = new Map<string, any>();
			data.forEach(card => map.set(card.id, card));
			this.setState({cardData: map});
		});
	}


	render(): JSX.Element {
		const selectedClass = this.getSelectedClass();

		let replayCount = null;
		if (this.state.winrateOverTime) {
			replayCount = (
				<p className="pull-right">
					{"based on " + toPrettyNumber(this.state.winrateOverTime.series[0].metadata["num_data_points"]) + " replays"}
				</p>
			);
		}

		const title = [
				<img src={STATIC_URL + "images/class-icons/alt/" + this.props.deckClass.toLocaleLowerCase() + ".png"}/>,
				<div>
					<h1>{this.props.deckName || toTitleCase(this.props.deckClass) + " Deck"}</h1>
					Some info here
					{replayCount}
				</div>
		];

		const decks = [];
		if (this.state.similarDecks) {
			this.state.similarDecks.series.data[this.props.deckClass].forEach(row => {
				decks.push(
					<li>
						<a href={"/cards/decks/" + row["deck_id"]}>
							{row["player_class"]}
							<span className="badge">{row["win_rate"] + "%"}</span>
						</a>
					</li>
				);
			})
		}
		const chartSeries = this.buildChartSeries();
		const costChart = chartSeries[3] && <CardDetailBarChart labelX="Manacurve" widthRatio={1.8} title="Cost" series={chartSeries[3]}/>

		const duration = this.state.averageDuration && Math.round(+this.state.averageDuration.series[0].data[0].x/60);
		return <div className="deck-detail-container">
			<div className="row">
				<div className="col-lg-3 col-left">
					<img className="hero-image" src={STATIC_URL + "images/class-portraits/" + this.props.deckClass.toLowerCase() + ".png"} height={300}/>
					<div className="chart-wrapper">
						{costChart}
					</div>
					<div className="deck-list">
						<span className="pull-right">Winrate</span>
						<h4>Similar decks</h4>
						<ul>
							{decks}
						</ul>
					</div>
				</div>
				<div className="col-lg-9 col-right">
					<div className="page-title">
						{title}
					</div>
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
					<h3>Mulligan guide</h3>
					<ClassFilter
						filters="All"
						selectionChanged={(selected) => this.setState({selectedClasses: selected})}
						multiSelect={false}
						hideAll
					/>
					{this.buildTable(selectedClass === "ALL" ? this.state.tableDataAll : this.state.tableDataClasses, selectedClass)}
				</div>
			</div>
		</div>;
	}

	buildChartSeries(): ChartSeries[] {
		const chartSeries = [];

		if (this.state.cardData && this.props.deckCards) {
			const data = {rarity: {}, cardtype: {}, cardset: {}, cost: {}};
			[0, 1, 2, 3, 4, 5, 6, 7].forEach(x => data.cost[x] = 0);
			const cards = this.props.deckCards.split(',').map(x => this.state.cardData.get(x));

			cards.forEach(card => {
				data["rarity"][card.rarity] = (data["rarity"][card.rarity] || 0) + 1;
				data["cardtype"][card.type] = (data["cardtype"][card.type] || 0) + 1;
				data["cardset"][card.set] = (data["cardset"][card.set] || 0) + 1;
				const cost = ""+Math.min(7, card.cost);
				data["cost"][cost] = (data["cost"][cost] || 0) + 1;
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
		}
		return chartSeries;
	}

	buildDeckCharts(): JSX.Element[] {
			const chartSeries = this.buildChartSeries();
			const rarityChart = chartSeries[0] && <CardDetailPieChart title="Rarity" series={chartSeries[0]}/>
			const typeChart = chartSeries[1] && <CardDetailPieChart title="Type" series={chartSeries[1]}/>
			const setChart = chartSeries[2] && <CardDetailPieChart title="Set" series={chartSeries[2]}/>
			const costChart = chartSeries[3] && <CardDetailBarChart labelX="Manacurve" widthRatio={1.8} title="Cost" series={chartSeries[3]}/>
			return [
				<div className ="row">
					<div className="chart-column col-lg-6 col-md-6 col-sm-6 col-xs-6">
						<div className="chart-wrapper wide">
							{costChart}
						</div>
					</div>
					<div className="chart-column col-lg-3 col-md-3 col-sm-6 col-xs-6">
						<div className="chart-wrapper">
							{rarityChart}
						</div>
					</div>
					<div className="chart-column col-lg-3 col-md-3 col-sm-6 col-xs-6">
						<div className="chart-wrapper">
							{typeChart}
						</div>
					</div>
				</div>
			];
	}

	getGroupedCards(cards: string[]): Map<string, number> {
		let map = new Map<string, number>();
		cards.forEach(c => map = map.set(c, (map.get(c) || 0) + 1));
		return map;
	}

	sortBy(prop: string): any {
		return (a, b) => a.cardObj[prop] > b.cardObj[prop] ? 1 : -1;
	}


	buildTable(tableData: TableData, key: string): JSX.Element {
		const cardRows = [];
		if (this.state.cardData) {
			if (tableData) {
				const rows = tableData.series.data[key];
				if (rows) {
					const baseWinrate = key === "ALL" ? this.getBaseWinrate() : tableData.series.metadata[key]["base_win_rate"]
					const cardList = []
					const groupedCards = this.getGroupedCards(this.props.deckCards.split(","));
					groupedCards.forEach((count, cardId) => cardList.push({cardObj: this.state.cardData.get(cardId), count: count}));
					cardList.sort(this.sortBy("name")).sort(this.sortBy("cost"));
					cardList.forEach(card => {
						const row = rows.find(r => r["card_id"] == card.cardObj.id);
						cardRows.push(this.buildCardRow(card, row, key !== "ALL", baseWinrate));
					})
				}
			}
		}

		const headers = [];
		headers.push(
			<th>Decklist</th>,
			<th>{"Winrate impact"}</th>,
			<th>% Kept</th>,
			<th>Avg. turns in hand</th>,
			<th>Winrate when drawn</th>,
			<th>Winrate when played</th>,
		)

		return <table className="table table-striped">
			<thead>
				<tr>
					{headers}
				</tr>
			</thead>
			<tbody>
				{cardRows}
			</tbody>
		</table>;
	}

	buildCardRow(card: any, row: TableRow, full: boolean, baseWinrate: number): JSX.Element {
		if (!card) {
			return null;
		}
		const cols = [];
		cols.push(<td>
			<div className="card-wrapper">
				<a href={"/cards/" + card.cardObj.id}>
					<CardTile height={34} card={card.cardObj} count={card.count} />
				</a>
			</div>
		</td>);
		if (row){
			const winrateDelta = +row["win_rate"] - baseWinrate;
			const tendencyStr = winrateDelta === 0 ? "    " : (winrateDelta > 0 ? "▲" : "▼");
			const multiplier = Math.min(5, Math.abs(winrateDelta));
			const color = winrateDelta > 0 ? "rgb(0, " + Math.round(150 * multiplier / 5) + ", 0)" : "rgb(" + Math.round(255 * multiplier / 5) + ", 0, 0)";
			cols.push(
				<td className="winrate-cell" style={{color: color}}>{tendencyStr + winrateDelta.toFixed(2) + "%"}</td>,
				<td>{ (row["keep_percentage"]) + "%"}</td>,
				<td>0</td>,
				<td>0</td>,
				<td>0</td>,
			);
		}
		return <tr className="card-table-row">
			{cols}
		</tr>;
	}

	getSelectedClass(): string {
		if (!this.state.selectedClasses) {
			return undefined;
		}
		let selectedClass = "ALL";
		this.state.selectedClasses.forEach((value, key) => {
			if(value) {
				selectedClass = key;
			}
		});
		return selectedClass;
	}

	getBaseWinrate(): number {
		if (!this.state.winrateOverTime) {
			return 50;
		}
		const data = this.state.winrateOverTime.series[0].data;
		return data[data.length - 1].y;
	}

	fetch() {
		this.queryManager.fetch(
			"/analytics/query/single_deck_mulligan_guide_by_class?TimeRange=LAST_1_DAY&RankRange=ALL&GameType=RANKED_STANDARD&deck_id=" + this.props.deckId,
			(success, json) => this.setState({tableDataClasses: json})
		);

		this.queryManager.fetch(
			"/analytics/query/single_deck_mulligan_guide?TimeRange=LAST_1_DAY&RankRange=ALL&GameType=RANKED_STANDARD&deck_id=" + this.props.deckId,
			(success, json) => this.setState({tableDataAll: json})
		);

		this.queryManager.fetch(
			"/analytics/query/single_deck_winrate_over_time?TimeRange=LAST_14_DAYS&RankRange=ALL&GameType=RANKED_STANDARD&deck_id=" + this.props.deckId,
			(success, json) => this.setState({winrateOverTime: json})
		);

		//mock data
		this.queryManager.fetch(
			"/analytics/query/single_card_include_popularity_over_time?card_id=" + 374 + "&TimeRange=LAST_14_DAYS&RankRange=ALL&GameType=RANKED_STANDARD",
			(success, json) => this.setState({popularityOverTime: json})
		);
		this.queryManager.fetch(
			"/analytics/query/class_card_top_decks_when_played?card_id=" + 846 + "&TimeRange=LAST_1_DAY&RankRange=ALL&GameType=RANKED_STANDARD",
			(success, json) => this.setState({similarDecks: json})
		);
	}

}
