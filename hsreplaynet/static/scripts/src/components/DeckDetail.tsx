import * as React from "react";
import CardDetailBarChart from "./charts/CardDetailBarChart";
import CardDetailGauge from "./charts/CardDetailGauge";
import CardDetailLineChart from "./charts/CardDetailLineChart";
import CardDetailPieChart from "./charts/CardDetailPieChart";
import CardIcon from "./CardIcon";
import CardTile from "./CardTile";
import ClassFilter from "./ClassFilter";
import ClassIcon from "./ClassIcon";
import DeckList from "./DeckList";
import HearthstoneJSON from "hearthstonejson";
import HDTButton from "./HDTButton";
import InfoIcon from "./InfoIcon";
import PopularityLineChart from "./charts/PopularityLineChart";
import QueryManager from "../QueryManager";
import WinrateLineChart from "./charts/WinrateLineChart";
import {TableData, TableRow, ChartSeries, RenderData} from "../interfaces";
import {getChartScheme, toPrettyNumber, toTitleCase, getColorString} from "../helpers";
import {Colors} from "../Colors";

interface Card {
	cardObj: any;
	count: number;
}

interface DeckDetailState {
	averageDuration?: RenderData;
	baseWinrates?: TableData;
	cardData?: Map<string, any>;
	popularityOverTime?: RenderData;
	selectedClasses?: Map<string, boolean>;
	similarDecks?: TableData;
	sortCol?: string;
	sortDirection?: number;
	tableDataAll?: TableData;
	tableDataClasses?: TableData;
	winrateOverTime?: RenderData;
}

interface DeckDetailProps extends React.ClassAttributes<DeckDetail> {
	deckCards: string;
	deckClass: string;
	deckId: number;
	deckName?: string;
}

export default class DeckDetail extends React.Component<DeckDetailProps, DeckDetailState> {
	private readonly queryManager: QueryManager = new QueryManager();

	constructor(props: DeckDetailProps, state: DeckDetailState) {
		super(props, state);
		this.state = {
			averageDuration: null,
			baseWinrates: null,
			cardData: null,
			popularityOverTime: null,
			selectedClasses: null,
			similarDecks: null,
			sortCol: "decklist",
			sortDirection: 1,
			tableDataAll: null,
			tableDataClasses: null,
			winrateOverTime: null,
		}

		this.fetch();

		new HearthstoneJSON().getLatest((data) => {
			const map = new Map<string, any>();
			data.forEach(card => map.set(card.id, card));
			this.setState({cardData: map});
		});
	}

	mockFree(): boolean {
		return window.location.href.split("?")[1] === "free";
	}

	getDeckName(): string {
		return this.props.deckName || toTitleCase(this.props.deckClass) + " Deck";
	}

	getBadgeColor(winrate: number) {
		const factor = winrate > 50 ? 4 : 3;
		const colorWinrate = 50 + Math.max(-50, Math.min(50, (factor * (winrate - 50))));
		return getColorString(Colors.REDGREEN4, 50, colorWinrate/100);
	}

	render(): JSX.Element {
		const selectedClass = this.getSelectedClass();
		const allSelected = selectedClass === "ALL";

		let replayCount = null;
		const selectedTable = allSelected ? this.state.tableDataAll : this.state.tableDataClasses;
		if (selectedTable) {
			const metadata = selectedTable.series.metadata;
			const numGames = allSelected ? metadata["total_games"] : metadata[selectedClass]["total_games"];
			replayCount = (
				<span className="replay-count pull-left">{"based on " + toPrettyNumber(numGames) + " replays"}</span>
			);
		}

		const title = [
			<img src={STATIC_URL + "images/class-icons/alt/" + this.props.deckClass.toLocaleLowerCase() + ".png"}/>,
			<h1>{this.getDeckName()}</h1>
		];

		const winrates = [];
		if (this.state.baseWinrates) {
			const data = this.state.baseWinrates.series.data;
			Object.keys(data).forEach(key => {
				const winrate = +data[key][0]["win_rate"];
				winrates.push(
					<li>
						<ClassIcon heroClassName={key} small/>
						{toTitleCase(data[key][0]["player_class"])}
						<div className="badge" style={{background: this.getBadgeColor(winrate)}}>{winrate + "%"}</div>
					</li>
				);
			});
		}

		const decks = [];
		if (this.state.similarDecks) {
			this.state.similarDecks.series.data[this.props.deckClass].forEach(row => {
				const cards = this.props.deckCards.split(",");
				const add = [];
				const sub = [];
				const addRndCards = () => {
					add.push(<CardIcon size={28} cardId={cards[Math.floor(Math.random() * cards.length)]} mark="+" markStyle={{color: "limegreen"}}/>);
					sub.push(<CardIcon size={28} cardId={cards[Math.floor(Math.random() * cards.length)]} mark="-" markStyle={{color: "red"}}/>);
				}
				addRndCards();
				if (Math.random() > 0.5) {
					addRndCards();
				}
				if (Math.random() > 0.3) {
					addRndCards();
				}

				decks.push(
					<li>
						<a href={"/cards/decks/" + row["deck_id"]}>
							<ClassIcon heroClassName={this.props.deckClass} />
							{toTitleCase(row["player_class"])}
						</a>
						<div className="card-icons">
							{sub}
							{add}
						</div>
					</li>
				);
			})
		}
		const chartSeries = this.buildChartSeries();
		const costChart = chartSeries && <CardDetailBarChart labelX="Manacurve" widthRatio={1.8} title="Cost" series={chartSeries}/>

		const duration = this.state.averageDuration && Math.round(+this.state.averageDuration.series[0].data[0].x/60);
		return <div className="deck-detail-container">
			<div className="row">
				<div className="col-lg-3 col-left">
					<img className="hero-image" src={STATIC_URL + "images/class-portraits/" + this.props.deckClass.toLowerCase() + ".png"} height={300}/>
					<div className="chart-wrapper">
						{costChart}
					</div>
					<HDTButton
						card_ids={this.props.deckCards.split(",")}
						class={this.props.deckClass}
						name={this.getDeckName()}
						sourceUrl={window.location.toString()}
					/>
					<div className="winrate-list">
						<h4>Winrate against</h4>
						<ul>
							{winrates}
						</ul>
					</div>
					<div className="deck-list">
						<span className="pull-right">Changes</span>
						<h4>Similar decks</h4>
						<ul id="similar-decks-list">
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
					<div id="opponent-class-filter">
						<span>Opponent:</span>
						<ClassFilter
							filters="All"
							selectionChanged={(selected) => this.setState({selectedClasses: selected})}
							multiSelect={false}
							hideAll
							minimal
							disabled={this.mockFree()}
						/>
					</div>
					<h3>
						{"Deck breakdown" + (!selectedClass || selectedClass === "ALL" ? "" : (" vs. " + toTitleCase(selectedClass)))}
					</h3>
					{replayCount}
					{this.buildTable(selectedTable, selectedClass)}
				</div>
			</div>
		</div>;
	}

	buildChartSeries(): ChartSeries {
		if (this.state.cardData && this.props.deckCards) {
			const costs = {};
			const costValues = [0, 1, 2, 3, 4, 5, 6, 7];
			costValues.forEach(value => costs[value] = 0);

			this.props.deckCards.split(',')
				.map(id => this.state.cardData.get(id))
				.forEach(card => costs[Math.min(7, card.cost)] += 1);

			const series = {
				name: "Manacurve",
				data: [],
				metadata: {
					chart_scheme: "cost"
				}
			}
			costValues.forEach(value => {
				series.data.push({x: ''+value, y: costs[value]});
			})
			return series;
		}
	}

	getGroupedCards(cards: string[]): Map<string, number> {
		let map = new Map<string, number>();
		cards.forEach(c => map = map.set(c, (map.get(c) || 0) + 1));
		return map;
	}

	buildTable(tableData: TableData, key: string): JSX.Element {
		const sortByCardProp = (prop: string) =>  {
			return (a, b) => a.card.cardObj[prop] > b.card.cardObj[prop] ? this.state.sortDirection : -this.state.sortDirection;
		}
		const cardRows = [];
		if (this.state.cardData) {
			if (tableData) {
				const rows = tableData.series.data[key];
				if (rows) {
					let mulliganAvg = 0;
					let drawnAvg = 0;
					let playedAvg = 0;
					let deadAvg = 0;
					rows.forEach(row => {
						mulliganAvg += +row["opening_hand_win_rate"];
						drawnAvg += +row["win_rate_when_drawn"];
						playedAvg += +row["win_rate_when_played"];
						const deadPercent = (1 - (+row["times_card_played"] / (+row["times_card_drawn"] + +row["times_kept"]))) * 100;
						row["dead_percent"] = ''+deadPercent;
						deadAvg += deadPercent;
					});
					mulliganAvg /= rows.length;
					drawnAvg /= rows.length;
					playedAvg /= rows.length;
					deadAvg /= rows.length;

					const cardList = []
					const groupedCards = this.getGroupedCards(this.props.deckCards.split(","));
					groupedCards.forEach((count, cardId) => cardList.push({cardObj: this.state.cardData.get(cardId), count: count}));

					const rowList = [];
					cardList.forEach(card => {
						const row = rows.find(r => r["card_id"] === card.cardObj.dbfId);
						rowList.push({row: row, card: card})
					})

					if (this.state.sortCol === "decklist") {
						rowList.sort(sortByCardProp("name")).sort(sortByCardProp("cost"));
					}
					else {
						rowList.sort((a, b) => +a.row[this.state.sortCol] > +b.row[this.state.sortCol] ? this.state.sortDirection : -this.state.sortDirection);
					}
					
					rowList.forEach(item => {
						cardRows.push(this.buildCardRow(item.card, item.row, key !== "ALL", mulliganAvg, drawnAvg, playedAvg, deadAvg));
					})
				}
			}
		}

		const onHeaderClick = (name: string, defaultDir: number = -1) => {
			this.setState({
				sortCol: name,
				sortDirection: this.state.sortCol !== name ? defaultDir : -this.state.sortDirection
			})
		};

		const sortIndicator = (name: string): JSX.Element => {
			return (
				<span className={name === this.state.sortCol ? "" : "no-sort"}>
					{this.state.sortDirection > 0 ? "▴" : "▾"}
				</span>
			);
		}

		const headers = [];
		headers.push(
			<th className="table-header-card" onClick={() => onHeaderClick("decklist", 1)}>
				Cards
				{sortIndicator("decklist")}
			</th>,
			<th onClick={() => onHeaderClick("opening_hand_win_rate")}>
				Mulligan WR
				{sortIndicator("opening_hand_win_rate")}
				<InfoIcon header="Mulligan Winrate" content="Winrate when the card ends up in the opening hand." />
			</th>,
			<th onClick={() => onHeaderClick("keep_percentage")}>
				Kept
				{sortIndicator("keep_percentage")}
				<InfoIcon header="Kept" content="Percentage card was kept when presented during mulligan." />
			</th>,
			<th onClick={() => onHeaderClick("win_rate_when_drawn")}>
				Drawn WR
				{sortIndicator("win_rate_when_drawn")}
				<InfoIcon header="Drawn Winrate" content="Average winrate of games where the card was drawn at any point." />
			</th>,
			<th onClick={() => onHeaderClick("win_rate_when_played")}>
				Played WR
				{sortIndicator("win_rate_when_played")}
				<InfoIcon header="Played Winrate" content="Average winrate of games where the card was played at any point." />
			</th>,
			<th onClick={() => onHeaderClick("dead_percent")}>
				Dead
				{sortIndicator("dead_percent")}
				<InfoIcon header="Dead Card" content="Percentage of time the card is drawn but never played (still in the hand at the end of the game)." />
			</th>,
			<th onClick={() => onHeaderClick("avg_turns_in_hand")}>
				Turns held
				{sortIndicator("avg_turns_in_hand")}
				<InfoIcon header="Turns held" content="Average number of turn the card is held in hand." />
			</th>,
			<th onClick={() => onHeaderClick("avg_turn_played_on")}>
				Turn played
				{sortIndicator("avg_turn_played_on")}
				<InfoIcon header="Turn played" content="Average turn the card is played on." />
			</th>,
		)

		return <table className="table table-striped">
			<thead className="table-header-sortable">
				<tr>
					{headers}
				</tr>
			</thead>
			<tbody>
				{cardRows}
			</tbody>
		</table>;
	}

	buildCardRow(card: any, row: TableRow, full: boolean, mulliganWinrate: number, drawnWinrate: number, playedWinrate: number, deadAverage: number): JSX.Element {
		if (!card) {
			return null;
		}
		const cols = [];
		cols.push(<td>
			<div className="card-wrapper">
				<a href={"/cards/" + card.cardObj.id}>
					<CardTile height={34} card={card.cardObj} count={card.count} rarityColored/>
				</a>
			</div>
		</td>);
		if (row){
			const mulligan = this.getWinrateData(mulliganWinrate, +row["opening_hand_win_rate"]);
			const drawn = this.getWinrateData(drawnWinrate, +row["win_rate_when_drawn"]);
			const played = this.getWinrateData(playedWinrate, +row["win_rate_when_played"]);
			const dead = this.getWinrateData(+row["dead_percent"], deadAverage);
			cols.push(
				<td className="winrate-cell" style={{color: mulligan.color}}>{mulligan.tendencyStr + (+row["opening_hand_win_rate"]).toFixed(2) + "%"}</td>,
				<td>{(+row["keep_percentage"]).toFixed(2) + "%"}</td>,
			);
			if (this.mockFree()) {
				cols.push(
					<td style={{background: "rgba(0,0,0,0.1)"}}></td>,
					<td style={{background: "rgba(0,0,0,0.1)"}}></td>,
					<td style={{background: "rgba(0,0,0,0.1)"}}></td>,
					<td style={{background: "rgba(0,0,0,0.1)"}}></td>,
					<td style={{background: "rgba(0,0,0,0.1)"}}></td>,
				);
			}
			else {
				cols.push(
					<td className="winrate-cell" style={{color: drawn.color}}>{drawn.tendencyStr + (+row["win_rate_when_drawn"]).toFixed(2) + "%"}</td>,
					<td className="winrate-cell" style={{color: played.color}}>{played.tendencyStr + (+row["win_rate_when_played"]).toFixed(2) + "%"}</td>,
					<td className="winrate-cell" style={{color: dead.color}}>{dead.tendencyStr + (+row["dead_percent"]).toFixed(2) + "%"}</td>,
					<td>{(+row["avg_turns_in_hand"]).toFixed(2)}</td>,
					<td>{(+row["avg_turn_played_on"]).toFixed(2)}</td>,
				);
			}
		}
		return <tr className="card-table-row">
			{cols}
		</tr>;
	}

	getWinrateData(baseWinrate: number, winrate: number) {
		const winrateDelta = winrate - baseWinrate;
		const colorWinrate = 50 + Math.max(-50, Math.min(50, (5 * winrateDelta)));
		const tendencyStr = winrateDelta === 0 ? "    " : (winrateDelta > 0 ? "▲" : "▼");
		const color = getColorString(Colors.REDGREEN3, 75, colorWinrate/100)
		return {delta: winrateDelta.toFixed(2), color, tendencyStr}
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

	fetch() {
		this.queryManager.fetch(
			"/analytics/query/single_deck_mulligan_guide_by_class?TimeRange=LAST_14_DAYS&RankRange=ALL&GameType=RANKED_STANDARD&deck_id=" + this.props.deckId,
			(success, json) => this.setState({tableDataClasses: json})
		);

		this.queryManager.fetch(
			"/analytics/query/single_deck_mulligan_guide?TimeRange=LAST_14_DAYS&RankRange=ALL&GameType=RANKED_STANDARD&deck_id=" + this.props.deckId,
			(success, json) => this.setState({tableDataAll: json})
		);

		this.queryManager.fetch(
			"/analytics/query/single_deck_winrate_over_time?TimeRange=LAST_14_DAYS&RankRange=ALL&GameType=RANKED_STANDARD&deck_id=" + this.props.deckId,
			(success, json) => this.setState({winrateOverTime: json})
		);

		this.queryManager.fetch(
			"/analytics/query/single_deck_base_winrate_by_opponent_class?TimeRange=LAST_14_DAYS&RankRange=ALL&GameType=RANKED_STANDARD&deck_id=" + this.props.deckId,
			(success, json) => this.setState({baseWinrates: json})
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
