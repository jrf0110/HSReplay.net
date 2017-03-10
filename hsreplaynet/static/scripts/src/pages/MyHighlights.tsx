import * as React from "react";
import CardData from "../CardData";
import CardHighlightTile from "../components/CardHighlightTile";
import DeckList from "../components/DeckList";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import QueryManager from "../QueryManager";
import WinrateLineChart from "../components/charts/WinrateLineChart";
import ClassArenaChart from "../components/charts/ClassAreaChart";
import {MyDecks, DeckObj, RenderQueryData, TableData, TableQueryData, RenderData} from "../interfaces";
import {isReady} from "../helpers";

interface MyHighlightsState {
	myDecks: MyDecks;
	cardStatsData?: TableData;
	rankData?: TableData;
	classOverTimeData?: RenderData;
	biggesetHitsData?: TableData;
	narrowEscapesData?: TableData;
}

interface MyHighlightsProps extends React.ClassAttributes<MyHighlights> {
	cardData: CardData;
	username: string;
}

export default class MyHighlights extends React.Component<MyHighlightsProps, MyHighlightsState> {
	readonly queryManager = new QueryManager();

	constructor(props: MyHighlightsProps, state: MyHighlightsState) {
		super(props, state);
		this.state = {
			myDecks: "loading",
			cardStatsData: "loading",
			rankData: "loading",
			classOverTimeData: "loading",
		}
		this.fetch();
	}

	getCard(dbfId: number): any {
		return this.props.cardData.fromDbf(dbfId || 1720);
	}

	render(): JSX.Element {
		let headerTiles = null;
		let cardTiles = null;
		const max = {
			damage_done: {}, healing_done: {}, times_played: {}, minions_killed: {},
			heroes_killed: {}, num_distinct_decks: {}, win_rate: {},
		};
		if (isReady(this.state.cardStatsData)) {
			const maxKeys = Object.keys(max);
			const cards = (this.state.cardStatsData as TableQueryData).series.data.ALL;
			cards.forEach(card => {
				maxKeys.forEach(key => {
					const current = max[key][key]
					if((!current || card[key] > current) && card[key]) {
						max[key] = card;
					}
				});
			});
		}

		const gameCounts = {num_standard_games: 0, num_wild_games: 0}
		const rank = {best_standard_rank: undefined, best_wild_rank: undefined}
		const legendRank = {best_standard_legend_rank: undefined, best_wild_legend_rank: undefined}
		if (isReady(this.state.rankData)) {
			const seasons = (this.state.rankData as TableQueryData).series.data.ALL;
			seasons.forEach(season => {
				Object.keys(gameCounts).forEach(key => gameCounts[key] += season[key]);
				Object.keys(rank).forEach(key => {
					if((!rank[key] || season[key] < rank[key]) && season[key]) {
						rank[key] = season[key];
					}
				});
				Object.keys(legendRank).forEach(key => {
					if((!legendRank[key] || season[key] < legendRank[key]) && season[key]) {
						legendRank[key] = season[key];
					}
				});
			});
		}

		let biggestHits = [];
		const decks: DeckObj[] = [];
		if (this.props.cardData) {
			const maxStandardRank = legendRank.best_standard_legend_rank ? "Legend " + legendRank.best_standard_legend_rank : rank.best_standard_rank;
			const maxWildRank = legendRank.best_wild_legend_rank ? "Legend " + legendRank.best_wild_legend_rank : rank.best_wild_rank;
			headerTiles = [
				<CardHighlightTile card={this.getCard(2053)} title="Highest rank | Standard" value={maxStandardRank} name={gameCounts.num_standard_games + " games"}/>,
				<CardHighlightTile card={this.getCard(42049)} title="Highest rank | Wild" value={maxWildRank} name={gameCounts.num_wild_games + " games"}/>,
			]
			cardTiles = [
				<CardHighlightTile card={this.getCard(max.damage_done["dbf_id"])} title="Most damage done" value={max.damage_done["damage_done"]}/>,
				<CardHighlightTile card={this.getCard(max.healing_done["dbf_id"])} title="Most healing done" value={max.healing_done["healing_done"]}/>,
				<CardHighlightTile card={this.getCard(max.times_played["dbf_id"])} title="Most played" value={max.times_played["times_played"] + " times"}/>,
				<CardHighlightTile card={this.getCard(max.minions_killed["dbf_id"])} title="Most minions killed" value={max.minions_killed["minions_killed"]}/>,
				<CardHighlightTile card={this.getCard(max.heroes_killed["dbf_id"])} title="Most heroes killed" value={max.heroes_killed["heroes_killed"]}/>,
				<CardHighlightTile card={this.getCard(max.num_distinct_decks["dbf_id"])} title="Most versatile" value={"in " + max.num_distinct_decks["num_distinct_decks"] + " decks"}/>,
				<CardHighlightTile card={this.getCard(max.win_rate["dbf_id"])} title="Highest winrate" value={max.win_rate["win_rate"] + "%"}/>,
			];

			if (this.state.myDecks !== "loading" && this.state.myDecks !== "error") {
				Object.keys(this.state.myDecks).forEach(id => {
					const deck = this.state.myDecks[id];
					const gameTypes = Object.keys(deck.game_types);
					if (gameTypes.indexOf("BGT_RANKED_STANDARD") !== -1 || gameTypes.indexOf("BGT_RANKED_WILD") !== -1) {
						const cards = deck["deck_list"];
						const deckList = cards.map(c => {return {card: this.props.cardData.fromDbf(c[0]), count: c[1]}});
						decks.push({
							cards: deckList,
							deckId: deck.deck_id,
							playerClass: deck.player_class,
							numGames: deck.total_games,
							winrate: deck.win_rate * 100,
							duration: deck.avg_game_length_seconds
						});
					}
				});
				decks.sort((a, b) => b.numGames - a.numGames);
			}
		
			if (isReady(this.state.biggesetHitsData)) {
				const hits = (this.state.biggesetHitsData as TableQueryData).series.data["ALL"];
				hits.sort((a, b) => +b.damage - +a.damage);
				hits.slice(0, 12).forEach(hit => {
					biggestHits.push(
						<CardHighlightTile card={this.getCard(+hit.dbf_id)} title="Click to watch replay" value={hit.damage + " damage"} href={hit.replay_url} />
					);
				});
			}
		}


		return <div id="my-highlights">
			<aside className="infobox">
				<h1>My Highlights</h1>
				<InfoboxFilterGroup header="Time frame" selectedValue={"ALL"} onClick={undefined}>
					<InfoboxFilter disabled value="ALL">All time</InfoboxFilter>
					<InfoboxFilter disabled value="CURRENT_SEASON">Current season</InfoboxFilter>
					<InfoboxFilter disabled value="PREVIOUS_SEASON">Previous season</InfoboxFilter>
				</InfoboxFilterGroup>
			</aside>
			<main>
				<section id="content-header">
					<div className="col-xs-12 col-sm-12 col-md-6 col-lg-6">
						<div id="winrate-chart-wrapper">
							<ClassArenaChart
								renderData={this.state.classOverTimeData}
								widthRatio={2}
							/>
						</div>
					</div>
					<div className="col-xs-12 col-sm-12 col-md-6 col-lg-6">
						<div id="winrate-chart-wrapper">
							<WinrateLineChart
								renderData={this.buildWinrateChartData()}
								widthRatio={2}
								title="Winrate - by week"
							/>
						</div>
					</div>
				</section>
				<section id="page-content">
					<ul className="nav nav-tabs content-tabs">
						<li className="active"><a data-toggle="tab" href="#highlights">Highlights</a></li>
						<li><a data-toggle="tab" href="#mostplayeddeck">Most played decks</a></li>
						<li><a data-toggle="tab" href="#biggesthits">Biggest hits</a></li>
					</ul>
					<div className="tab-content">
						<div id="highlights" className="tab-pane fade in active">
							{headerTiles}
							{cardTiles}
						</div>
						<div id="mostplayeddeck" className="tab-pane fade">
							<DeckList decks={decks.slice(0, 10)} urlGameType={null} pageSize={5}/>
						</div>
						<div id="biggesthits" className="tab-pane fade">
							{biggestHits}
						</div>
					</div>
				</section>
			</main>
		</div>;
	}

	buildWinrateChartData(): RenderData {
		if (!isReady(this.state.classOverTimeData)) {
			return this.state.classOverTimeData;
		}
		const data = {};
		const counts = {};
		(this.state.classOverTimeData as RenderQueryData).series.forEach(series => {
			series.data.forEach(point => {
				data[point.game_date] = (data[point.game_date] || 0) + +point.win_rate * +point.num_games;
				counts[point.game_date] = (counts[point.game_date] || 0) + +point.num_games;
			})
		});
		Object.keys(counts).forEach(key => data[key] /= counts[key]);
		return {
			series: [{
				data: Object.keys(data).map(key => {return {x: key, y: data[key]}}),
				name: "winrate_over_time"
			}]
		};
	}

	fetch(): void {
		this.queryManager.fetch("/decks/mine/", (data) => this.setState({myDecks: data}));
		this.queryManager.fetch(
			"/analytics/query/single_account_lo_individual_card_stats",
			(data) => this.setState({cardStatsData: data})
		);
		this.queryManager.fetch(
			"/analytics/query/single_account_lo_best_rank_by_season",
			(data) => this.setState({rankData: data})
		);
		this.queryManager.fetch(
			"/analytics/query/single_account_lo_lifetime_class_performance_over_time",
			(data) => this.setState({classOverTimeData: data})
		);
		this.queryManager.fetch(
			"/analytics/query/single_account_lo_biggest_hits",
			(data) => this.setState({biggesetHitsData: data})
		);
		this.queryManager.fetch(
			"/analytics/query/single_account_lo_narrow_escapes",
			(data) => this.setState({narrowEscapesData: data})
		);
	}
}
