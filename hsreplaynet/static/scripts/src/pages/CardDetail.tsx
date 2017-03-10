import * as React from "react";
import CardDetailPieChart from "../components/charts/CardDetailPieChart";
import CardRankingTable from "../components/CardRankingTable";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import PopularityLineChart from "../components/charts/PopularityLineChart";
import RecommendedDecksList from "../components/carddetail/RecommendedDecksList";
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
import CardData from "../CardData";

interface TableDataMap {
	[key: string]: TableData;
}

interface RenderDataMap {
	[key: string]: RenderData;
}

interface CardDetailState {
	classDistribution?: RenderDataMap;
	deckData?: TableDataMap;
	discoverChoices?: TableDataMap;
	popularTargets?: TableDataMap;
	queryMap?: QueryMap,
	showInfo?: boolean;
	statsByTurn?: RenderDataMap;
	statsByTurnByOpponent?: RenderDataMap;
	statsOverTime?: RenderDataMap;
}

interface CardDetailProps extends React.ClassAttributes<CardDetail> {
	card: any;
	cardId: string;
	cardData: CardData;
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
			classDistribution: {},
			deckData: {},
			discoverChoices: {},
			popularTargets: {},
			queryMap: getQueryMapFromLocation(this.defaultQueryMap, this.getAllowedValues()),
			showInfo: false,
			statsByTurn: {},
			statsByTurnByOpponent: {},
			statsOverTime: {},
		}
	}

	getAllowedValues() {
		return this.props.userIsPremium ? this.allowedValuesPremium : this.allowedValues;
	}

	cardHasTargetReqs(): boolean {
		if (this.props.card && this.props.card.playRequirements) {
			return Object.keys(this.props.card.playRequirements).some(req => req.toLowerCase().indexOf("target") !== -1);
		}
		return false;
	}

	cardHasDiscover(): boolean {
		return this.props.card && this.props.card.text && this.props.card.text.indexOf("Discover") !== -1;
	}

	cardIsNeutral(): boolean {
		return this.props.card && this.props.card.playerClass === "NEUTRAL";
	}

	componentWillReceiveProps(nextProps: CardDetailProps) {
		if (!this.props.card && nextProps.card) {
			if (isWildCard(nextProps.card)) {
				setQueryMap(this, "gameType", "RANKED_WILD");
			}
		}
	}

	componentDidUpdate(prevProps: CardDetailProps, prevState: CardDetailState) {
		const cacheKey = genCacheKey(this)
		const prevCacheKey = genCacheKey(this, prevState);
		if (cacheKey !== prevCacheKey) {
			this.fetch();
		}
		else if (!prevProps.cardData && this.props.cardData) {
			this.fetch();
		}
		setLocationQueryString(this.state.queryMap, this.defaultQueryMap);
	}

	render(): JSX.Element {
		const cacheKey = genCacheKey(this);

		let content = null;
		let replayCount = null;
		if (this.props.card) {

			const set = this.props.card.set.toLowerCase();
			if (isReady(this.state.statsOverTime[cacheKey])) {
				const winrateOverTime = (this.state.statsOverTime[cacheKey] as RenderQueryData).series.find(x => x.metadata.is_winrate_data);
				replayCount = toPrettyNumber(winrateOverTime.metadata.num_data_points);
			}
		
			const cardNameStyle = {
				backgroundImage: "url(/static/images/set-icons/" + set + ".png"
			}

			if (!isCollectibleCard(this.props.card)) {
				content = (
					<div className="message-wrapper">
						<h3>Sorry, we currently don't have statistics for non-collectible cards.</h3>
						<a href="/cards/stats/" className="promo-button">Show available cards</a>
					</div>
				);
			}
			else {
				let cardStats = [];
				let cardStatsLoading = false;

				if (this.cardIsNeutral()){
					if (isReady(this.state.classDistribution[cacheKey])) {
						cardStats.push(
							<div id="class-chart">
								<CardDetailPieChart
									removeEmpty
									renderData={this.state.classDistribution[cacheKey]}
									scheme={getChartScheme("class")}
									sortByValue
									title={"Most included by"}
								/>
							</div>
						);
					}
					else {
						cardStatsLoading = true;
					}
				}

				if (this.cardHasTargetReqs()) {
					if (isReady(this.state.popularTargets[cacheKey])) {
						cardStats.push([
							<h4>Most popular targets</h4>,
							<CardRankingTable
								cardData={this.props.cardData}
								numRows={8}
								tableData={this.mergeHeroes(this.state.popularTargets[cacheKey] as TableQueryData)}
								dataKey={"ALL"}
								clickable
								urlGameType={getQueryMapDiff(this.state.queryMap, this.defaultQueryMap).gameType}
							/>
						]);
					}
					else {
						cardStatsLoading = true;
					}
				}

				if (this.cardHasDiscover()) {
					if (isReady(this.state.discoverChoices[cacheKey])) {
						cardStats.push([
							<h4>Most popular Discover choices</h4>,
							<CardRankingTable
								cardData={this.props.cardData}
								numRows={8}
								tableData={this.state.discoverChoices[cacheKey]}
								dataKey={"ALL"}
								clickable
								urlGameType={getQueryMapDiff(this.state.queryMap, this.defaultQueryMap).gameType}
							/>
						]);
					}
					else {
						cardStatsLoading = true;
					}
				}

				if (cardStats.length) {
					const colWidth = 12 / cardStats.length;
					cardStats = cardStats.map(obj => (
						<div className={"col-lg-" + colWidth + " col-md-" + colWidth}>
							{obj}
						</div>
					));
				}
				else if (cardStatsLoading) {
					cardStats.push(<h3 className="message-wrapper">Loading...</h3>);
				}
				else {
					cardStats.push(<h3 className="message-wrapper">We currently don't have any specific stats for this card.</h3>);
				}

				const headerContent = [
					<div className="col-lg-6 col-md-6">
						<div className="chart-wrapper">
							<PopularityLineChart
								renderData={this.state.statsOverTime[cacheKey]}
								widthRatio={2}
								maxYDomain={100}
							/>
						</div>
					</div>,
					<div className="col-lg-6 col-md-6">
						<div className="chart-wrapper">
							<WinrateLineChart
								renderData={this.state.statsOverTime[cacheKey]}
								widthRatio={2}
							/>
						</div>
					</div>
				]

				const turnCharts = (
					<div className="container-fluid">
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
						</div>
						<div className="row">
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
						</div>
					</div>
				);

				let recommendedDecks = null;
				if (this.state.queryMap.gameType === "ARENA") {
					recommendedDecks = <h3 className="message-wrapper">No decks found.</h3>;
				}
				else {
					recommendedDecks = (
						<RecommendedDecksList
							card={this.props.card}
							cardData={this.props.cardData}
							deckData={this.state.deckData[cacheKey]}
							urlGameType={getQueryMapDiff(this.state.queryMap, this.defaultQueryMap).gameType}
						/>
					);
				}

				content = [
					<section id="content-header">
						{headerContent}
					</section>,
					<section id="page-content">
						<ul className="nav nav-tabs content-tabs">
							<li className="active"><a data-toggle="tab" href="#recommended-decks">Recommended decks</a></li>
							<li><a data-toggle="tab" href="#turn-stats">Turn details</a></li>
							<li><a data-toggle="tab" href="#card-stats">Card stats</a></li>
						</ul>
						<div className="tab-content">
							<div id="recommended-decks" className="tab-pane fade in active">
								{recommendedDecks}
							</div>
							<div id="turn-stats" className="tab-pane fade">
								{turnCharts}
							</div>
							<div id="card-stats" className={"tab-pane fade"}>
								<div id="card-tables">
									{cardStats}
								</div>
							</div>
						</div>
					</section>
				]
			}
		}
		else {
			content = <h3 className="message-wrapper">Loading...</h3>;
		}

		let race = null;
		if (this.props.card && this.props.card.race) {
			race = (
				<li>
					Race
					<span className="infobox-value">{toTitleCase(this.props.card.race)}</span>
				</li>
			);
		}

		let craftingCost = null;
		if (this.props.card && this.props.card.rarity && this.props.card.rarity !== "FREE" && this.props.card.set !== "CORE") {
			craftingCost = (
				<li>
					Cost
					<span className="infobox-value">{getDustCost(this.props.card) + " Dust"}</span>
				</li>
			);
		}

		return <div className="card-detail-container">
			<aside className="infobox">
				<img className="card-image" src={"https://art.hearthstonejson.com/v1/render/latest/enUS/256x/" + this.props.cardId + ".png"} />
				<p>{this.getCleanFlavorText()}</p>
				<InfoboxFilterGroup header="Mode" selectedValue={this.state.queryMap["gameType"]} onClick={(value) => setQueryMap(this, "gameType", value)}>
					<InfoboxFilter disabled={this.props.card && isWildCard(this.props.card)} value="RANKED_STANDARD">Ranked Standard</InfoboxFilter>
					<InfoboxFilter value="RANKED_WILD">Ranked Wild</InfoboxFilter>
					<InfoboxFilter disabled={this.props.card && isWildCard(this.props.card)} value="ARENA">Arena</InfoboxFilter>
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
				<h2>Info</h2>
				<ul>
					<li>
						Class
						<span className="infobox-value">{this.props.card && toTitleCase(this.props.card.playerClass)}</span>
					</li>
					<li>
						Type
						<span className="infobox-value">{this.props.card && toTitleCase(this.props.card.type)}</span>
					</li>
					<li>
						Rarity
						<span className="infobox-value">{this.props.card && toTitleCase(this.props.card.rarity)}</span>
					</li>
					<li>
						Set
						<span className="infobox-value">{this.props.card && this.props.card.set && setNames[this.props.card.set.toLowerCase()]}</span>
					</li>
					{race}
					{craftingCost}
					<li>
						Artist
						<span className="infobox-value">{this.props.card && this.props.card.artist}</span>
					</li>
				</ul>
			</aside>
			<main>
				{content}
			</main>
		</div>;
	}

	mergeHeroes(tableData: TableQueryData): TableQueryData {
		if (!this.props.cardData) {
			return tableData;
		}
		const all = [];
		const hero = {dbf_id: -1, popularity: 0};
		tableData.series.data.ALL.forEach((x) => {
			const card = this.props.cardData.fromDbf(x.dbf_id);
			if (card.type === "HERO") {
				hero.popularity += +x.popularity;
			}
			else {
				all.push(x);
			}
		});
		all.push(hero);
		return {series: {data: {ALL: all}}};
	}

	getCleanFlavorText(): string {
		if (!this.props.card || !this.props.card.flavor) {
			return null;
		}
		return this.props.card.flavor.replace("<i>", "").replace("</i>", "");
	}

	fetch() {
		if (!this.props.card || !isCollectibleCard(this.props.card)) {
			return;
		}

		const buildUrl = (queryName: string): string => {
			return "/analytics/query/" + queryName + "?card_id=" + this.props.card.dbfId + "&GameType=" + this.state.queryMap.gameType;
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

		if (this.cardIsNeutral() && hasNoData("classDistribution")) {
			this.queryManager.fetch(
				buildUrl("single_card_class_distribution_by_include_count"),
				(data) => setData("classDistribution", data)
			);
		}

		if (this.cardHasTargetReqs() && hasNoData("popularTargets")) {
			this.queryManager.fetch(
				buildUrl("single_card_popular_targets"),
				(data) => setData("popularTargets", data)
			);
		}

		if (this.cardHasDiscover() && hasNoData("discoverChoices")) {
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
		if (hasNoData("statsOverTime")) {
			this.queryManager.fetch(
				buildUrl("single_card_stats_over_time"),
				(data) => setData("statsOverTime", data)
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
