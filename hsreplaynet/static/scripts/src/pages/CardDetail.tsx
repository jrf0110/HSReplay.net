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
	TableData, DeckObj, TableQueryData, RenderQueryData
} from "../interfaces";
import HearthstoneJSON from "hearthstonejson";
import {
	toTitleCase, getChartScheme, setNames, toPrettyNumber, isWildCard, 
	isCollectibleCard, getColorString, getDustCost, isLoading, isError, isReady
} from "../helpers";
import QueryManager from "../QueryManager";
import {
	genCacheKey, QueryMap, getQueryMapArray, getQueryMapFromLocation, queryMapHasChanges,
	setLocationQueryString, setQueryMap, toQueryString, getQueryMapDiff
} from "../QueryParser"

interface TableDataMap {
	[key: string]: TableData;
}

interface RenderDataMap {
	[key: string]: RenderData;
}

interface CardDetailState {
	card?: any;
	cardData?: Map<string, any>;
	classDistribution?: RenderDataMap;
	deckData?: TableDataMap;
	discoverChoices?: TableDataMap;
	popularTargets?: TableDataMap;
	popularityOverTime?: RenderDataMap;
	queryMap?: QueryMap,
	showInfo?: boolean;
	statsByTurn?: RenderDataMap;
	statsByTurnByOpponent?: RenderDataMap;
	winrateOverTime?: RenderDataMap;
}

interface CardDetailProps extends React.ClassAttributes<CardDetail> {
	cardId: string;
	dbfId: number;
	userIsPremium: boolean;
}

export default class CardDetail extends React.Component<CardDetailProps, CardDetailState> {
	private readonly queryManager: QueryManager = new QueryManager();
	private readonly maxDecks = 20;
	private readonly defaultQueryMap: QueryMap = {
		gameType: "RANKED_STANDARD",
		opponentClass: "ALL",
	}

	private readonly allowedValues = {
		gameType: ["RANKED_STANDARD", "RANKED_WILD", "ARENA"],
		opponentClass: [],
	}

	private readonly allowedValuesPremium = {
		gameType: ["RANKED_STANDARD", "RANKED_WILD", "ARENA"],
	}

	constructor(props: CardDetailProps, state: CardDetailState) {
		super(props, state);
		this.state = {
			card: null,
			cardData: null,
			classDistribution: {},
			deckData: {},
			discoverChoices: {},
			popularTargets: {},
			popularityOverTime: {},
			queryMap: getQueryMapFromLocation(this.defaultQueryMap, this.getAllowedValues()),
			showInfo: false,
			statsByTurn: {},
			statsByTurnByOpponent: {},
			winrateOverTime: {},
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

	getAllowedValues() {
		return this.props.userIsPremium ? this.allowedValuesPremium : this.allowedValues;
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

	componentDidUpdate(prevProps: CardDetailProps, prevState: CardDetailState) {
		const cacheKey = genCacheKey(this)
		const prevCacheKey = genCacheKey(this, prevState);
		if (cacheKey !== prevCacheKey) {
			this.fetch(this.state.card);
		}
		setLocationQueryString(this.state.queryMap, this.defaultQueryMap);
	}

	render(): JSX.Element {
		const cacheKey = genCacheKey(this);

		let mostPopularTargets = null;
		if (this.cardHasTargetReqs() && isReady(this.state.popularTargets[cacheKey])) {
			mostPopularTargets = [
				<h4>Most popular targets</h4>,
				<CardRankingTable
					cardData={this.state.cardData}
					numRows={8}
					tableData={this.state.popularTargets[cacheKey]}
					dataKey={"ALL"}
					clickable
					urlGameType={getQueryMapDiff(this.state.queryMap, this.defaultQueryMap).gameType}
				/>
			];
		}

		let discoverChoices = null;
		if (this.cardHasDiscover() && isReady(this.state.discoverChoices[cacheKey])) {
			discoverChoices = [
				<h4>Most popular Discover choices</h4>,
				<CardRankingTable
					cardData={this.state.cardData}
					numRows={8}
					tableData={this.state.discoverChoices[cacheKey]}
					dataKey={"ALL"}
					clickable
					urlGameType={getQueryMapDiff(this.state.queryMap, this.defaultQueryMap).gameType}
				/>
			];
		}

		let classDistribution = null;
		let replayCount = null;
		let content = null;
		if (this.state.card) {
			const set = this.state.card.set.toLowerCase();
			if (isReady(this.state.winrateOverTime[cacheKey])) {
				replayCount = toPrettyNumber((this.state.winrateOverTime[cacheKey] as RenderQueryData).series[0].metadata["num_data_points"]);
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
									renderData={this.state.popularityOverTime[cacheKey]}
									widthRatio={2}
									maxYDomain={100}
								/>
							</div>
						</div>
						<div className="col-lg-6 col-md-6">
							<div className="chart-wrapper">
								<WinrateLineChart
									renderData={this.state.winrateOverTime[cacheKey]}
									widthRatio={2}
								/>
							</div>
						</div>
					</div>,
					<div className="row">
						<div className="opponent-filter-wrapper">
							<PremiumWrapper
								isPremium={this.props.userIsPremium}
								infoHeader="Turn data by opponent"
								infoContent="Break down the turn played distribution and winrate by turn played even further and look at each opponent class individually!"
							>
								<h3>Opponent class</h3>
								<ClassFilter
									filters="All"
									hideAll
									minimal
									multiSelect={false}
									selectedClasses={[this.state.queryMap.opponentClass as FilterOption]}
									selectionChanged={(selected) => this.props.userIsPremium && setQueryMap(this, "opponentClass", selected[0])}
								/>
							</PremiumWrapper>
						</div>
						<div className="col-lg-6 col-md-6">
							<div className="chart-wrapper">
								<PremiumWrapper isPremium={this.props.userIsPremium} iconStyle={{display: "none"}}>
									<TurnPlayedBarChart
										renderData={this.state.queryMap.opponentClass === "ALL" ? this.state.statsByTurn[cacheKey] : this.state.statsByTurnByOpponent[cacheKey]}
										opponentClass={this.state.queryMap.opponentClass}
										widthRatio={2}
										premiumLocked={!this.props.userIsPremium}
									/>
								</PremiumWrapper>
							</div>
						</div>
						<div className="col-lg-6 col-md-6">
							<div className="chart-wrapper">
								<PremiumWrapper isPremium={this.props.userIsPremium} iconStyle={{display: "none"}}>
									<WinrateByTurnLineChart
										renderData={this.props.userIsPremium && this.state.queryMap.opponentClass === "ALL" ? this.state.statsByTurn[cacheKey] : this.state.statsByTurnByOpponent[cacheKey]}
										opponentClass={this.state.queryMap.opponentClass}
										widthRatio={2}
										premiumLocked={!this.props.userIsPremium}
									/>
								</PremiumWrapper>
							</div>
						</div>
					</div>,
					<div className="row" id="card-tables">
						{cardTables}
					</div>,
					this.buildRecommendedDecks()
				];
				
				if (this.cardIsNeutral() && isReady(this.state.classDistribution[cacheKey])) {
					classDistribution = (
						<div className="class-chart">
							<CardDetailPieChart
								fixedFontSize={22}
								fontColor="white"
								percent
								removeEmpty
								renderData={this.state.classDistribution[cacheKey]}
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
				<img className="card-image" src={"https://art.hearthstonejson.com/v1/render/latest/enUS/256x/" + this.props.cardId + ".png"} />
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
				<InfoboxFilterGroup header="Mode" selectedValue={this.state.queryMap["gameType"]} onClick={(value) => setQueryMap(this, "gameType", value)}>
					<InfoboxFilter value="RANKED_STANDARD">Ranked Standard</InfoboxFilter>
					<InfoboxFilter value="RANKED_WILD">Ranked Wild</InfoboxFilter>
					<InfoboxFilter value="ARENA">Arena</InfoboxFilter>
				</InfoboxFilterGroup>
				<h2>Data</h2>
				<ul>
					<li>
						Based on
						<span className="infobox-value">{replayCount && replayCount + " replays"}</span>
					</li>
					<li>
						Time frame
						<span className="infobox-value">Last 30 days</span>
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
		const cacheKey = genCacheKey(this);
		if (!isReady(this.state.deckData[cacheKey])) {
			return null;
		}

		if(!this.state.cardData) {
			return null;
		}

		const decks: DeckObj[] = [];
		const data = (this.state.deckData[cacheKey] as TableQueryData).series.data;
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
			<DeckList 
				decks={decks}
				pageSize={5}
				hideTopPager
				urlGameType={getQueryMapDiff(this.state.queryMap, this.defaultQueryMap).gameType}
			/>
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

		const buildUrl = (queryName: string): string => {
			return "/analytics/query/" + queryName + "?card_id=" + this.props.dbfId + "&GameType=" + this.state.queryMap.gameType;
		}

		const cacheKey = genCacheKey(this);
		const setData = (key: string, data: any) => {
			const obj = Object.assign({}, this.state[key]);
			obj[cacheKey] = data;
			const newState = {};
			newState[key] = obj;
			this.setState(newState);
		}

		const hasNoData = (key: string): boolean => {
			return !this.state[key][cacheKey] || isError(this.state[key][cacheKey]);
		}

		if (this.cardIsNeutral(card) && hasNoData("classDistribution")) {
			this.queryManager.fetch(
				buildUrl("single_card_class_distribution_by_include_count"),
				(data) => setData("classDistribution", data)
			);
		}

		if (this.cardHasTargetReqs(card) && hasNoData("popularTargets")) {
			this.queryManager.fetch(
				buildUrl("single_card_popular_targets"),
				(data) => setData("popularTargets", data)
			);
		}

		if (this.cardHasDiscover(card) && hasNoData("discoverChoices")) {
			this.queryManager.fetch(
				buildUrl("single_card_choices_by_winrate"),
				(data) => setData("discoverChoices", data)
			);
		}

		if (this.props.userIsPremium && hasNoData("statsByTurnByOpponent")) {
			this.queryManager.fetch(
				buildUrl("single_card_stats_by_turn_and_opponent"),
				(data) => setData("statsByTurnByOpponent", data)
			);
		}

		if (hasNoData("statsByTurn")) {
			this.queryManager.fetch(
				buildUrl("single_card_stats_by_turn"),
				(data) => setData("statsByTurn", data)
			);
		}
		if (hasNoData("popularityOverTime")) {
			this.queryManager.fetch(
				buildUrl("single_card_include_popularity_over_time"),
				(data) => setData("popularityOverTime", data)
			);
		}
		if (hasNoData("winrateOverTime")) {
			this.queryManager.fetch(
				buildUrl("single_card_winrate_over_time"),
				(data) => setData("winrateOverTime", data)
			);
		}

		if (this.state.queryMap.gameType !== "ARENA" && hasNoData("deckData")) {
			this.queryManager.fetch(
				"/analytics/query/list_decks_by_win_rate?GameType=" + this.state.queryMap.gameType,
				(data) => setData("deckData", data)
			);
		}
	}
}
