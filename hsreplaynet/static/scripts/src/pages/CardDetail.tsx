import * as React from "react";
import CardDetailPieChart from "../components/charts/CardDetailPieChart";
import CardRankingTable from "../components/CardRankingTable";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import DeckList from "../components/DeckList";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import PopularityLineChart from "../components/charts/PopularityLineChart";
import PremiumWrapper from "../components/PremiumWrapper";
import TurnPlayedBarChart from "../components/charts/TurnPlayedBarChart";
import WinrateByTurnLineChart from "../components/charts/WinrateByTurnLineChart";
import WinrateLineChart from "../components/charts/WinrateLineChart";
import {Colors} from "../Colors";
import {
	FilterData, Filter, FilterElement, FilterDefinition, KeyValuePair,
	Query, RenderData, ChartSeries, ChartSeriesMetaData, DataPoint,
	TableData, DeckObj
} from "../interfaces";
import HearthstoneJSON from "hearthstonejson";
import {
	toTitleCase, getChartScheme, setNames, toPrettyNumber, isWildCard, 
	isCollectibleCard, getColorString, getDustCost
} from "../helpers";
import QueryManager from "../QueryManager";

interface CardDetailState {
	card?: any;
	cardData?: Map<string, any>;
	classDistribution?: RenderData;
	deckData?: TableData;
	discoverChoices?: TableData;
	popularTargets?: TableData;
	popularityOverTime?: RenderData;
	selectedClasses?: FilterOption[];
	showInfo?: boolean;
	statsByTurn?: RenderData;
	statsByTurnByOpponent?: RenderData;
	winrateOverTime?: RenderData;
}

interface CardDetailProps extends React.ClassAttributes<CardDetail> {
	cardId: string;
	dbfId: number;
	userIsPremium: boolean;
}

export default class CardDetail extends React.Component<CardDetailProps, CardDetailState> {
	private readonly queryManager: QueryManager = new QueryManager();
	private readonly maxDecks = 20;

	constructor(props: CardDetailProps, state: CardDetailState) {
		super(props, state);
		this.state = {
			card: null,
			cardData: null,
			classDistribution: "loading",
			deckData: "loading",
			discoverChoices: "loading",
			popularTargets: "loading",
			popularityOverTime: "loading",
			selectedClasses: ["ALL"],
			showInfo: false,
			statsByTurn: "loading",
			statsByTurnByOpponent: "loading",
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

	cardHasDiscover(card?: any): boolean {
		card = card || this.state.card;
		return card && card.text && card.text.indexOf("Discover") !== -1;
	}

	cardIsNeutral(card?: any): boolean {
		card = card || this.state.card;
		return card && card.playerClass === "NEUTRAL";
	}

	render(): JSX.Element {
		let mostPopularTargets = null;
		if (this.cardHasTargetReqs() && this.state.popularTargets && this.state.popularTargets !== "loading" && this.state.popularTargets !== "error") {
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

		let discoverChoices = null;
		if (this.cardHasDiscover() && this.state.discoverChoices && this.state.discoverChoices !== "loading" && this.state.discoverChoices !== "error") {
			discoverChoices = [
				<h4>Best Discover choices</h4>,
				<CardRankingTable
					cardData={this.state.cardData}
					numRows={8}
					tableData={this.state.popularTargets}
					dataKey={"ALL"}
					clickable
				/>
			];
		}

		let classDistribution = null;
		let replayCount = null;
		let content = null;
		if (this.state.card) {
			const set = this.state.card.set.toLowerCase();
			if (this.state.winrateOverTime !== "loading" && this.state.winrateOverTime !== "error") {
				replayCount = toPrettyNumber(this.state.winrateOverTime.series[0].metadata["num_data_points"]);
			}
		
			const cardNameStyle = {
				backgroundImage: "url(/static/images/set-icons/" + set + ".png"
			}

			if (!isCollectibleCard(this.state.card)) {
				content = (
					<div id="message-wrapper">
						<h3>Sorry, we currently don't have statistics for non-collectible cards.</h3>
						<a href="/cards/">Check out our card database for card with available stats!</a>
					</div>
				);
			}
			else {

				let cardTables = [];
				const colWidth = 12 / (+mostPopularTargets + +discoverChoices);

				if (mostPopularTargets) {
					cardTables.push(
						<div className={"col-lg-" + colWidth + " col-md-" + colWidth}>
							{mostPopularTargets}
						</div>
					);
				}
				if (discoverChoices) {
					cardTables.push(
						<div className={"col-lg-" + colWidth + " col-md-" + colWidth}>
							{discoverChoices}
						</div>
					);
				}

				content = [
					<div className="row">
						<div className="col-lg-6 col-md-6">
							<div className="chart-wrapper">
								<PopularityLineChart
									renderData={this.state.popularityOverTime}
									widthRatio={2}
								/>
							</div>
						</div>
						<div className="col-lg-6 col-md-6">
							<div className="chart-wrapper">
								<WinrateLineChart
									renderData={this.state.winrateOverTime}
									widthRatio={2}
								/>
							</div>
						</div>
					</div>,
					<div className="row">
						<div className="col-lg-6 col-md-6">
							<div className="chart-wrapper">
								<TurnPlayedBarChart
									renderData={this.state.selectedClasses[0] === "ALL" ? this.state.statsByTurn : this.state.statsByTurnByOpponent}
									opponentClass={this.state.selectedClasses[0]}
									widthRatio={2}
								/>
							</div>
						</div>
						<div className="col-lg-6 col-md-6">
							<div className="chart-wrapper">
								<WinrateByTurnLineChart
									renderData={this.state.selectedClasses[0] === "ALL" ? this.state.statsByTurn : this.state.statsByTurnByOpponent}
									opponentClass={this.state.selectedClasses[0]}
									widthRatio={2}
								/>
							</div>
						</div>
					</div>,
					<div className="row" id="card-tables">
						{cardTables}
					</div>,
					this.buildRecommendedDecks()
				];
				
				if (this.cardIsNeutral() && this.state.classDistribution !== "loading" && this.state.classDistribution !== "error") {
					classDistribution = (
						<div className="class-chart">
							<CardDetailPieChart
								fixedFontSize={22}
								fontColor="white"
								percent
								removeEmpty
								renderData={this.state.classDistribution}
								scheme={getChartScheme("class")}
								sortByValue
								textPrecision={2}
								title={"Class Popularity"}
							/>
						</div>
					);
				}
			}
		}

		let race = null;
		if (this.state.card && this.state.card.race) {
			race = (
				<li>
					Race
					<span className="infobox-value">{toTitleCase(this.state.card.race)}</span>
				</li>
			);
		}

		let craftingCost = null;
		if (this.state.card && this.state.card.rarity && this.state.card.rarity !== "FREE" && this.state.card.set !== "CORE") {
			craftingCost = (
				<li>
					Cost
					<span className="infobox-value">{getDustCost(this.state.card) + " Dust"}</span>
				</li>
			);
		}

		return <div className="card-detail-container">
			<aside className="infobox">
				<img className="card-image" src={"http://media.services.zam.com/v1/media/byName/hs/cards/enus/" + this.props.cardId + ".png"} />
				<p>{this.getCleanFlavorText()}</p>
				<h2>Info</h2>
				<ul>
					<li>
						Class
						<span className="infobox-value">{this.state.card && toTitleCase(this.state.card.playerClass)}</span>
					</li>
					<li>
						Type
						<span className="infobox-value">{this.state.card && toTitleCase(this.state.card.type)}</span>
					</li>
					<li>
						Rarity
						<span className="infobox-value">{this.state.card && toTitleCase(this.state.card.rarity)}</span>
					</li>
					<li>
						Set
						<span className="infobox-value">{this.state.card && this.state.card.set && setNames[this.state.card.set.toLowerCase()]}</span>
					</li>
					{race}
					{craftingCost}
					<li>
						Artist
						<span className="infobox-value">{this.state.card && this.state.card.artist}</span>
					</li>
				</ul>
				<PremiumWrapper 
					isPremium={this.props.userIsPremium}
					infoHeader="Turn data by opponent"
					infoContent="Break down the turn played distribution and winrate by turn played even further and look at each opponent class individually!"
				>
					<h2>Opponent class</h2>
					<ClassFilter
						filters="All"
						hideAll
						minimal
						multiSelect={false}
						selectedClasses={this.state.selectedClasses}
						selectionChanged={(selected) => this.setState({selectedClasses: selected})}
					/>
				</PremiumWrapper>
				<h2>Time frame</h2>
				<InfoboxFilterGroup selectedValue={"LAST_30_DAYS"} onClick={(value) => undefined}>
					<InfoboxFilter value="LAST_30_DAYS">Last 30 days</InfoboxFilter>
				</InfoboxFilterGroup>
				<h2>Data</h2>
				<ul>
					<li>
						Based on
						<span className="infobox-value">{replayCount && replayCount + " replays"}</span>
					</li>
				</ul>
				{classDistribution}
			</aside>
			<main className="container-fluid">
				{content}
			</main>
		</div>;
	}

	getCleanFlavorText(): string {
		if (!this.state.card || !this.state.card.flavor) {
			return null;
		}
		return this.state.card.flavor.replace("<i>", "").replace("</i>", "");
	}

	buildRecommendedDecks(): JSX.Element[] {
		if (!this.state.deckData || this.state.deckData === "loading" || this.state.deckData === "error") {
			return null;
		}

		if(!this.state.cardData) {
			return null;
		}

		const decks: DeckObj[] = [];
		const data = this.state.deckData.series.data;
		Object.keys(data).forEach(playerClass => {
			const classDecks = [];

			data[playerClass].forEach(deck => {
				const cards = JSON.parse(deck["deck_list"]);
				if (cards.some(pair => pair[0] === this.props.dbfId)) {
					classDecks.push({cards, deck, numGames: +deck["total_games"]});
				}
			})

			classDecks.sort((a, b) => b.numGames - a.numGames);

			classDecks.slice(0, 10).forEach(deck => {
				const cardData = deck.cards.map(c => {return {card: this.state.cardData.get(''+c[0]), count: c[1]}});
				decks.push({
					cards: cardData,
					deckId: +deck.deck["deck_id"],
					duration: +deck.deck["avg_game_length_seconds"],
					numGames: +deck.deck["total_games"],
					playerClass: playerClass,
					winrate: +deck.deck["win_rate"]
				});
			});
		});

		if (!decks.length) {
			return null;
		}

		decks.sort((a, b) => b.numGames - a.numGames);

		return [
			<h4>Recommended Decks</h4>,
			<DeckList decks={decks} pageSize={5} hideTopPager/>
		];
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

		if (this.cardHasDiscover(card)) {
			this.queryManager.fetch(
				buildUrl("single_card_choices_by_winrate", mode),
				(data) => this.setState({discoverChoices: data})
			);
		}

		if (this.props.userIsPremium) {
			this.queryManager.fetch(
				buildUrl("single_card_stats_by_turn_and_opponent", mode),
				(data) => this.setState({statsByTurnByOpponent: data})
			);
		}

		this.queryManager.fetch(
			buildUrl("single_card_stats_by_turn", mode),
			(data) => this.setState({statsByTurn: data})
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
			"/analytics/query/list_decks_by_win_rate?GameType=" + mode,
			(data) => this.setState({deckData: data})
		);
	}
}
