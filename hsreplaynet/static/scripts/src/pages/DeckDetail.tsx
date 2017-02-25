import * as React from "react";
import CardDetailBarChart from "../components/charts/CardDetailBarChart";
import CardDetailGauge from "../components/charts/CardDetailGauge";
import CardDetailPieChart from "../components/charts/CardDetailPieChart";
import CardIcon from "../components/CardIcon";
import CardTile from "../components/CardTile";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import ClassIcon from "../components/ClassIcon";
import DeckList from "../components/DeckList";
import HDTButton from "../components/HDTButton";
import HearthstoneJSON from "hearthstonejson";
import InfoIcon from "../components/InfoIcon";
import PopularityLineChart from "../components/charts/PopularityLineChart";
import PremiumWrapper from "../components/PremiumWrapper";
import QueryManager from "../QueryManager";
import WinrateLineChart from "../components/charts/WinrateLineChart";
import moment from "moment";
import {CardObj, DeckObj, TableData, TableRow, ChartSeries, RenderData} from "../interfaces";
import {
	cardSorting, getChartScheme, getColorString, getDustCost,
	getHeroCardId, toPrettyNumber, toTitleCase, wildSets,
} from "../helpers";
import {showModal} from "../Premium";
import {Colors} from "../Colors";

interface Card {
	cardObj: any;
	count: number;
}

interface DeckDetailState {
	averageDuration?: RenderData;
	baseWinrates?: TableData;
	cardData?: Map<string, any>;
	deckData?: TableData;
	expandWinrate?: boolean;
	popularityOverTime?: RenderData;
	selectedClasses?: FilterOption[];
	showInfo?: boolean;
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
	userIsPremium: boolean;
}

export default class DeckDetail extends React.Component<DeckDetailProps, DeckDetailState> {
	private readonly queryManager: QueryManager = new QueryManager();

	constructor(props: DeckDetailProps, state: DeckDetailState) {
		super(props, state);
		this.state = {
			averageDuration: "loading",
			baseWinrates: "loading",
			cardData: null,
			deckData: "loading",
			expandWinrate: false,
			popularityOverTime: "loading",
			similarDecks: "loading",
			showInfo: false,
			selectedClasses: ["ALL"],
			sortCol: "decklist",
			sortDirection: 1,
			tableDataAll: "loading",
			tableDataClasses: "loading",
			winrateOverTime: "loading",
		}

		new HearthstoneJSON().getLatest((data) => {
			const map = new Map<string, any>();
			data.forEach(card => map.set(''+card.dbfId, card));
			this.setState({cardData: map});
			this.fetch();
		});

		if (this.getQueryParams().indexOf("premium-modal") !== -1) {
			showModal();
		}
	}

	getQueryParams(): string[] {
		const params = window.location.href.split("?")[1];
		if (params) {
			return params.split("&");
		}
		return [];
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
		const selectedClass = this.state.selectedClasses[0];
		const allSelected = selectedClass === "ALL";

		let replayCount = null;
		const selectedTable = allSelected ? this.state.tableDataAll : this.state.tableDataClasses;
		if (selectedTable !== "loading" && selectedTable !== "error") {
			const metadata = selectedTable.series.metadata;
			const numGames = allSelected ? metadata["total_games"] : metadata[selectedClass]["total_games"];
			replayCount = (
				<span className="replay-count">{"based on " + toPrettyNumber(numGames) + " replays"}</span>
			);
		}

		const title = [
			<img src={STATIC_URL + "images/class-icons/alt/" + this.props.deckClass.toLocaleLowerCase() + ".png"}/>,
			<h1>{this.getDeckName()}</h1>
		];

		const winrates = [];
		if (this.state.baseWinrates !== "loading" && this.state.baseWinrates !== "error") {
			const data = Object.assign({}, this.state.baseWinrates.series.data);
			const keys = Object.keys(data);
			keys.sort((a, b) => data[a][0]["player_class"] > data[b][0]["player_class"] ? 1 : -1)
			keys.forEach(key => {
				const winrate = +data[key][0]["win_rate"];
				winrates.push(
					<li>
						vs. {toTitleCase(data[key][0]["player_class"])}
						<span className="infobox-value">{(+winrate).toFixed(1) + "%"}</span>
					</li>
				);
			});
		}

		let dustCost = 0;
		let totalCost = 0;
		if (this.state.cardData) {
			this.props.deckCards.split(",").forEach(id => {
				const card = this.state.cardData.get(id);
				dustCost += getDustCost(card.rarity);
				totalCost += card.cost; 
			});
		}
		
		let hdtButton = null;
		if (this.state.cardData) {
			hdtButton = (
				<HDTButton
					card_ids={this.props.deckCards.split(",").map(dbfId => this.state.cardData.get(dbfId).id)}
					class={this.props.deckClass}
					name={this.getDeckName()}
					sourceUrl={window.location.toString()}
				/>
			);
		}
		
		const deckNameStyle = {
			backgroundImage: "url(/static/images/class-icons/" + this.props.deckClass.toLowerCase() + ".png"
		}
		
		const dustCostStyle = {
			backgroundImage: "url(/static/images/dust.png"
		}

		let deckData = null;
		if (this.state.deckData && this.state.deckData !== "loading" && this.state.deckData !== "error") {
			const deck = this.state.deckData.series.data[this.props.deckClass].find(x => +x["deck_id"] === this.props.deckId);
			if (deck) {
				const winrateClassNames = [];
				let subWinrates = null;
				
				if (winrates.length) {
					winrateClassNames.push("selectable", "expandable");
					if (this.state.expandWinrate) {
						winrateClassNames.push("expanded");
						subWinrates = (
							<ul>{winrates}</ul>
						);
					}
				}

				deckData = [
					<h2>Data</h2>,
					<ul>
						<li>
							Based on
							<span className="infobox-value">{toPrettyNumber(+deck["total_games"]) + " replays"}</span>
						</li>
						<li className={winrateClassNames.join(" ")} onClick={() => this.setState({expandWinrate: !this.state.expandWinrate})}>
							Winrate
							<span className="infobox-value">{(+deck["win_rate"]).toFixed(1) + "%"}</span>
							{subWinrates}
						</li>
						<li>
							Match duration
							<span className="infobox-value">{moment.duration(+deck["avg_game_length_seconds"], "second").asMinutes().toFixed(1) + " minutes"}</span>
						</li>
						<li>
							Number of turns
							<span className="infobox-value">{deck["avg_num_player_turns"]}</span>
						</li>
					</ul>
				];
			}
		}

		const asideClassNames = ["infobox"];
		const mainClassNames = ["container-fluid"];
		if (this.state.showInfo) {
			mainClassNames.push("hidden-xs");
		}
		else {
			asideClassNames.push("hidden-xs");
		}

		const backButton = (
			<button type="button" className="btn btn-primary btn-full visible-xs" onClick={() => this.setState({showInfo: false})}>
				Back to the stats
			</button>
		);

		return <div className="deck-detail-container">
			<aside className={asideClassNames.join(" ")}>
				{backButton}
				<img className="hero-image" src={"https://art.hearthstonejson.com/v1/256x/" + getHeroCardId(this.props.deckClass, true) + ".jpg"} />
				<h2>Info</h2>
				<ul>
					<li>
						Class
						<span className="infobox-value">{toTitleCase(this.props.deckClass)}</span>
					</li>
					<li>
						Type
						<span className="infobox-value">{totalCost > 100 ? "Control" : (totalCost > 80 ? "Midrange" : "Aggro")}</span>
					</li>
					<li>
						Cost
						<span className="infobox-value">{dustCost && dustCost + " Dust"}</span>
					</li>
					{hdtButton}
				</ul>
				<PremiumWrapper isPremium={this.props.userIsPremium}>
					<h2>Breakdown vs. opponent</h2>
					<ClassFilter
						filters="All"
						hideAll
						minimal
						multiSelect={false}
						selectedClasses={this.state.selectedClasses}
						selectionChanged={(selected) => this.props.userIsPremium && this.setState({selectedClasses: selected})}
					/>
				</PremiumWrapper>
				{deckData}
				{backButton}
			</aside>
			<main className={mainClassNames.join(" ")}>
				<button type="button" className="btn btn-default btn-full visible-xs" onClick={() => this.setState({showInfo: true})}>
					Show deck info
				</button>
				<div className="row">
					<div className="col-lg-6 col-md-6">
						<div className="chart-wrapper wide">
							<PopularityLineChart
								renderData={this.state.popularityOverTime}
								widthRatio={2}
							/>
						</div>
					</div>
					<div className="col-lg-6 col-md-6">
						<div className="chart-wrapper wide">
							<WinrateLineChart
								renderData={this.state.winrateOverTime}
								widthRatio={2}
							/>
						</div>
					</div>
				</div>
				<h3>
					{"Deck breakdown" + (!selectedClass || selectedClass === "ALL" ? "" : (" vs. " + toTitleCase(selectedClass)))}
				</h3>
				{replayCount}
				<div className="row table-wrapper">
					{this.buildTable(selectedTable, selectedClass)}
				</div>
				{this.buildSimilarDecks()}
			</main>
		</div>;
	}
	
	buildSimilarDecks(): JSX.Element[] {
		if (!this.state.deckData || this.state.deckData === "loading" || this.state.deckData === "error") {
			return null;
		}

		if(!this.state.cardData) {
			return null;
		}
		
		const decks: DeckObj[] = [];
		const classDecks = this.state.deckData.series.data[this.props.deckClass];

		const deckList = [];
		this.props.deckCards.split(",").forEach(id => deckList[id] = (deckList[id] || 0) + 1);
		
		const byDistance = [];
		classDecks.forEach(deck => {
			let distance = 0;
			const cards = JSON.parse(deck["deck_list"]);
			cards.forEach(pair => {
				distance += Math.abs(pair[1] - (deckList[pair[0]] || 0));
			})
			if (distance > 1 && distance < 3) {
				byDistance.push({cards, deck, distance, numGames: +deck["total_games"]});
			}
		});

		if (!byDistance.length) {
			return null;
		}

		byDistance.sort((a, b) => b.numGames - a.numGames);

		byDistance.slice(0, 15).forEach(deck => {
			const cardData = deck.cards.map(c => {return {card: this.state.cardData.get(''+c[0]), count: c[1]}});
			decks.push({
				cards: cardData,
				deckId: +deck.deck["deck_id"],
				duration: +deck.deck["avg_game_length_seconds"],
				numGames: +deck.deck["total_games"],
				playerClass: this.props.deckClass,
				winrate: +deck.deck["win_rate"],
			});
		})

		const cards: CardObj[] = [];
		this.props.deckCards.split(",").forEach(id => {
			const card = this.state.cardData.get(id);
			const existing = cards.find(c => c.card.dbfId === +id);
			if (existing) {
				existing.count += 1;
			}
			else {
				cards.push({card, count: 1});
			}
		});

		return [
			<h3>Similar Decks</h3>,
			<DeckList decks={decks} pageSize={5} hideTopPager compareWith={cards} />
		];
	}

	buildChartSeries(): RenderData {
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
			return {series: [series]};
		}
		return "loading";
	}

	getGroupedCards(cards: string[]): Map<string, number> {
		let map = new Map<string, number>();
		cards.forEach(c => map = map.set(c, (map.get(c) || 0) + 1));
		return map;
	}

	buildTable(tableData: TableData, key: string): JSX.Element {
		const cardRows = [];
		if (this.state.cardData) {
			const cardList = []
			const rowList = [];
			const groupedCards = this.getGroupedCards(this.props.deckCards.split(","));
			groupedCards.forEach((count, cardId) => cardList.push({cardObj: this.state.cardData.get(cardId), count: count}));

			let rows = null;
			let mulliganAvg = 0;
			let drawnAvg = 0;
			let playedAvg = 0;
			let deadAvg = 0;
			let mulliganSuggestionAvg = 0;
			let maxMulliganSuggestion = 0;
			if (tableData !== "loading" && tableData !== "error") {
				rows = tableData.series.data[key];
				if (rows) {
					rows.forEach(row => {
						mulliganAvg += +row["opening_hand_win_rate"];
						drawnAvg += +row["win_rate_when_drawn"];
						playedAvg += +row["win_rate_when_played"];
						const deadPercent = (1 - (+row["times_card_played"] / (+row["times_card_drawn"] + +row["times_kept"]))) * 100;
						row["dead_percent"] = ''+deadPercent;
						deadAvg += deadPercent;
						const mulliganSuggestion = +row["opening_hand_win_rate"] * +row["keep_percentage"] * 0.01;
						row["mulligan_suggestion"] = mulliganSuggestion;
						mulliganSuggestionAvg += mulliganSuggestion;
						if (mulliganSuggestion > maxMulliganSuggestion) {
							maxMulliganSuggestion = mulliganSuggestion;
						}
					});
					mulliganAvg /= rows.length;
					drawnAvg /= rows.length;
					playedAvg /= rows.length;
					deadAvg /= rows.length;
					mulliganSuggestionAvg /= rows.length;
					
				}
			}
			cardList.forEach(card => {
				const row = rows && rows.find(r => r["card_id"] === card.cardObj.dbfId);
				rowList.push({row: row, card: card})
			})

			if (this.state.sortCol === "decklist") {
				rowList.sort(cardSorting);
			}
			else {
				rowList.sort((a, b) => +a.row[this.state.sortCol] > +b.row[this.state.sortCol] ? this.state.sortDirection : -this.state.sortDirection);
			}
			
			rowList.forEach((item, index) => {
				cardRows.push(this.buildCardRow(item.card, index === 0, rowList.length, item.row, key !== "ALL", mulliganAvg, drawnAvg, playedAvg, deadAvg, mulliganSuggestionAvg, maxMulliganSuggestion));
			})
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
			<th onClick={() => onHeaderClick("mulligan_suggestion")}>
				Mulligan
				{sortIndicator("mulligan_suggestion")}
				<InfoIcon header="Mulligan" content="Mulligan suggestion based on winrate and percent kept by players." />
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

	buildCardRow(
		card: any, firstRow: boolean, rowCount: number, row: TableRow, full: boolean, mulliganWinrate: number,
		drawnWinrate: number, playedWinrate: number, deadAverage: number,
		mulliganSuggestionAvg: number, maxMulliganSuggestion: number
	): JSX.Element {
		if (!card) {
			return null;
		}
		const cols = [];
		cols.push(<td>
			<div className="card-wrapper">
				<a href={"/cards/" + card.cardObj.dbfId}>
					<CardTile height={34} card={card.cardObj} count={card.count} rarityColored/>
				</a>
			</div>
		</td>);
		if (row) {
			const mulligan = this.getWinrateData(mulliganWinrate, +row["opening_hand_win_rate"]);
			const mulliganSuggestion = this.getWinrateData(mulliganSuggestionAvg, +row["mulligan_suggestion"]);
			const drawn = this.getWinrateData(drawnWinrate, +row["win_rate_when_drawn"]);
			const played = this.getWinrateData(playedWinrate, +row["win_rate_when_played"]);
			const dead = this.getWinrateData(+row["dead_percent"], deadAverage);
			cols.push(
				<td className="winrate-cell" style={{color: mulliganSuggestion.color}}>{mulliganSuggestion.tendencyStr + (100 * +row["mulligan_suggestion"] / maxMulliganSuggestion).toFixed(1)}</td>,
			);
			if (!this.props.userIsPremium) {
				if (firstRow) {
					cols.push(
						<td colSpan={7} rowSpan={rowCount} style={{background: "rgba(0,0,0,0.1)", textAlign: "center"}}>
							<PremiumWrapper isPremium>
								<h1 style={{padding: "50px"}}>HearthSim Premium</h1>
								<ul style={{listStyleType: "none", padding: 0}}>
									<li>You miss the old Hearthstone?</li>
									<li>The more controlled Hearthstone?</li>
									<li>See how games unfold Hearthstone?</li>
									<li>No face explode Hearthstone?</li>
									<li>You hate the new Hearthstone?</li>
									<li>The dead turn two Hearthstone?</li>
									<li>The pirate spew Hearthstone?</li>
									<li>Rather stay in queue Hearthstone?</li>
									<li>This is the sweet Hearthstone</li>
									<li>Feel like elite Hearthstone</li>
									<li>Just beat the meta</li>
									<li>Subscribe to HearthSim Premium</li>
								</ul>
								<br/>
								<button type="button" className="btn btn-primary" onClick={() => showModal()}>Find more information here!</button>
							</PremiumWrapper>
						</td>
					);
				}
			}
			else {
				cols.push(
					<td className="winrate-cell" style={{color: mulligan.color}}>{mulligan.tendencyStr + (+row["opening_hand_win_rate"]).toFixed(1) + "%"}</td>,
					<td>{(+row["keep_percentage"]).toFixed(1) + "%"}</td>,
					<td className="winrate-cell" style={{color: drawn.color}}>{drawn.tendencyStr + (+row["win_rate_when_drawn"]).toFixed(1) + "%"}</td>,
					<td className="winrate-cell" style={{color: played.color}}>{played.tendencyStr + (+row["win_rate_when_played"]).toFixed(1) + "%"}</td>,
					<td className="winrate-cell" style={{color: dead.color}}>{dead.tendencyStr + (+row["dead_percent"]).toFixed(1) + "%"}</td>,
					<td>{(+row["avg_turns_in_hand"]).toFixed(1)}</td>,
					<td>{(+row["avg_turn_played_on"]).toFixed(1)}</td>,
				);
			}
		}
		else {
			cols.push(
				<td style={{whiteSpace: "pre"}}> </td>,
				<td></td>,
				<td></td>,
				<td></td>,
				<td></td>,
				<td></td>,
				<td></td>,
				<td></td>,
			);
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
		return {delta: winrateDelta.toFixed(1), color, tendencyStr}
	}

	isWildDeck(): boolean {
		if (!this.props.deckCards || !this.state.cardData) {
			return undefined;
		}
		return this.props.deckCards.split(",").map(id => this.state.cardData.get(id))
			.some(card => wildSets.indexOf(card.set) !== -1);
	}

	fetch() {
		const mode = this.isWildDeck() ? "RANKED_WILD" : "RANKED_STANDARD";

		if (this.props.userIsPremium) {
			this.queryManager.fetch(
				"/analytics/query/single_deck_mulligan_guide_by_class?GameType=" + mode + "&deck_id=" + this.props.deckId,
				(data) => this.setState({tableDataClasses: data})
			);
		}

		this.queryManager.fetch(
			"/analytics/query/single_deck_mulligan_guide?GameType=" + mode + "&deck_id=" + this.props.deckId,
			(data) => this.setState({tableDataAll: data})
		);

		this.queryManager.fetch(
			"/analytics/query/single_deck_winrate_over_time?GameType=" + mode + "&deck_id=" + this.props.deckId,
			(data) => this.setState({winrateOverTime: data})
		);

		this.queryManager.fetch(
			"/analytics/query/single_deck_base_winrate_by_opponent_class?GameType=" + mode + "&deck_id=" + this.props.deckId,
			(data) => this.setState({baseWinrates: data})
		);

		this.queryManager.fetch(
			"/analytics/query/single_deck_popularity_over_time?GameType=" + mode + "&deck_id=" + this.props.deckId,
			(data) => this.setState({popularityOverTime: data})
		);

		this.queryManager.fetch(
			"/analytics/query/list_decks_by_win_rate?GameType=" + mode,
			(data) => this.setState({deckData: data})
		);
	}

}
