import * as React from "react";
import CardData from "../CardData";
import RecommendedDecksList from "../components/carddetail/RecommendedDecksList";
import CardRankingTable from "../components/CardRankingTable";
import CardDetailPieChart from "../components/charts/CardDetailPieChart";
import PopularityLineChart from "../components/charts/PopularityLineChart";
import TurnPlayedBarChart from "../components/charts/TurnPlayedBarChart";
import WinrateByTurnLineChart from "../components/charts/WinrateByTurnLineChart";
import WinrateLineChart from "../components/charts/WinrateLineChart";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import DataInjector from "../components/DataInjector";
import DataText from "../components/DataText";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import ChartLoading from "../components/loading/ChartLoading";
import HideLoading from "../components/loading/HideLoading";
import TableLoading from "../components/loading/TableLoading";
import PremiumWrapper from "../components/PremiumWrapper";
import DataManager from "../DataManager";
import {
	getChartScheme, getDustCost, isCollectibleCard,
	isWildCard, setNames, toPrettyNumber, toTitleCase,
} from "../helpers";
import {
	RenderData, TableData,
} from "../interfaces";
import {
	getQueryMapDiff, getQueryMapFromLocation, QueryMap, setLocationQueryString, setQueryMap,
} from "../QueryParser";
import InfoboxLastUpdated from "../components/InfoboxLastUpdated";
import UserData from "../UserData";

interface TableDataMap {
	[key: string]: TableData;
}

interface RenderDataMap {
	[key: string]: RenderData;
}

interface CardDetailState {
	queryMap?: QueryMap;
	showInfo?: boolean;
}

interface CardDetailProps extends React.ClassAttributes<CardDetail> {
	card: any;
	cardData: CardData;
	cardId: string;
	dbfId: number;
	user: UserData;
}

export default class CardDetail extends React.Component<CardDetailProps, CardDetailState> {
	private readonly dataManager: DataManager = new DataManager();
	private readonly defaultQueryMap: QueryMap = {
		gameType: "RANKED_STANDARD",
		opponentClass: "ALL",
		tab: "recommended-decks",
	};

	private readonly allowedValues = {
		gameType: ["RANKED_STANDARD", "RANKED_WILD", "ARENA"],
		opponentClass: [],
	};

	private readonly allowedValuesPremium = {
		gameType: ["RANKED_STANDARD", "RANKED_WILD", "ARENA"],
	};

	constructor(props: CardDetailProps, state: CardDetailState) {
		super(props, state);
		this.state = {
			queryMap: getQueryMapFromLocation(this.defaultQueryMap, this.getAllowedValues()),
			showInfo: false,
		};
	}

	getAllowedValues() {
		return this.props.user.isPremium() ? this.allowedValuesPremium : this.allowedValues;
	}

	cardHasTargetReqs(): boolean {
		if (this.props.card && this.props.card.playRequirements) {
			return Object.keys(this.props.card.playRequirements).some((req) => req.toLowerCase().indexOf("target") !== -1);
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
		setLocationQueryString(this.state.queryMap, this.defaultQueryMap);
	}

	render(): JSX.Element {
		let content = null;
		if (this.props.card) {
			if (!isCollectibleCard(this.props.card)) {
				content = (
					<div className="message-wrapper">
						<h3>Sorry, we currently don't have statistics for non-collectible cards.</h3>
						<a href="/cards/" className="promo-button">Show available cards</a>
					</div>
				);
			}
			else {
				let cardStats = [];
				let cardStatsLoading = false;

				if (this.cardIsNeutral()) {
					cardStats.push(
						<div id="class-chart">
							<DataInjector
								dataManager={this.dataManager}
								query={{url: "single_card_class_distribution_by_include_count", params: this.getParams()}}
							>
								<ChartLoading>
									<CardDetailPieChart
										removeEmpty
										scheme={getChartScheme("class")}
										sortByValue
										title={"Most included by"}
									/>
								</ChartLoading>
							</DataInjector>
						</div>,
					);
				}

				if (this.cardHasTargetReqs()) {
					cardStats.push([
						<h4>Most popular targets</h4>,
						<DataInjector
							dataManager={this.dataManager}
							query={{url: "single_card_popular_targets", params: this.getParams()}}
							modify={(data) => this.mergeHeroes(data)}
						>
							<TableLoading>
								<CardRankingTable
									cardData={this.props.cardData}
									numRows={8}
									dataKey={"ALL"}
									clickable
									urlGameType={getQueryMapDiff(this.state.queryMap, this.defaultQueryMap).gameType}
								/>
							</TableLoading>
						</DataInjector>,
					]);
				}

				if (this.cardHasDiscover()) {
					cardStats.push([
						<h4>Most popular Discover choices</h4>,
						<DataInjector
							dataManager={this.dataManager}
							query={{url: "single_card_choices_by_winrate", params: this.getParams()}}
						>
							<TableLoading>
								<CardRankingTable
									cardData={this.props.cardData}
									numRows={8}
									dataKey={"ALL"}
									clickable
									urlGameType={getQueryMapDiff(this.state.queryMap, this.defaultQueryMap).gameType}
								/>
							</TableLoading>
						</DataInjector>,
					]);
				}

				if (cardStats.length) {
					const colWidth = 12 / cardStats.length;
					cardStats = cardStats.map((obj) => (
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
							<DataInjector
								dataManager={this.dataManager}
								query={{url: "single_card_stats_over_time", params: this.getParams()}}
							>
								<ChartLoading>
									<PopularityLineChart
										widthRatio={2}
										maxYDomain={100}
									/>
								</ChartLoading>
							</DataInjector>
						</div>
					</div>,
					<div className="col-lg-6 col-md-6">
						<div className="chart-wrapper">
							<DataInjector
								dataManager={this.dataManager}
								query={{url: "single_card_stats_over_time", params: this.getParams()}}
							>
								<ChartLoading>
									<WinrateLineChart
										widthRatio={2}
									/>
								</ChartLoading>
							</DataInjector>
						</div>
					</div>,
				];

				const turnStatsQuery = {
					params: this.getParams(),
					url: (
						this.state.queryMap.opponentClass !== "ALL" && this.props.user.isPremium()
						? "/analytics/query/single_card_stats_by_turn_and_opponent"
						: "/analytics/query/single_card_stats_by_turn"
					),
				};

				const turnStatsNoDataCondition = (data: RenderData): boolean => {
					if (this.state.queryMap.opponentClass !== "ALL" && this.props.user.isPremium()) {
						const selectedSeries = data.series.find((s) => s.metadata.opponent_class === this.state.queryMap.opponentClass);
						return !selectedSeries || selectedSeries.data.length < 2;
					}
					return data.series[0].data.length < 2;
				};

				const turnCharts = (
					<div className="container-fluid">
						<div className="row">
							<div className="opponent-filter-wrapper">
								<h3>Opponent class</h3>
								<ClassFilter
									filters="All"
									hideAll
									minimal
									multiSelect={false}
									selectedClasses={[this.state.queryMap.opponentClass as FilterOption]}
									selectionChanged={(selected) => this.props.user.isPremium() && setQueryMap(this, "opponentClass", selected[0])}
								/>
							</div>
						</div>
						<div className="row">
							<div className="col-lg-6 col-md-6">
								<div className="chart-wrapper">
									<DataInjector
										dataManager={this.dataManager}
										query={turnStatsQuery}
									>
										<ChartLoading noDataCondition={turnStatsNoDataCondition}>
											<TurnPlayedBarChart
												opponentClass={this.state.queryMap.opponentClass}
												widthRatio={2}
												premiumLocked={!this.props.user.isPremium()}
											/>
										</ChartLoading>
									</DataInjector>
								</div>
							</div>
							<div className="col-lg-6 col-md-6">
								<div className="chart-wrapper">
									<DataInjector
										dataManager={this.dataManager}
										query={turnStatsQuery}
									>
										<ChartLoading noDataCondition={turnStatsNoDataCondition}>
											<WinrateByTurnLineChart
												opponentClass={this.state.queryMap.opponentClass}
												widthRatio={2}
												premiumLocked={!this.props.user.isPremium()}
											/>
										</ChartLoading>
									</DataInjector>
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
						<DataInjector
							dataManager={this.dataManager}
							query={{url: "list_decks_by_win_rate", params: {GameType: this.state.queryMap.gameType}}}
						>
							<TableLoading>
								<RecommendedDecksList
									card={this.props.card}
									cardData={this.props.cardData}
									urlGameType={getQueryMapDiff(this.state.queryMap, this.defaultQueryMap).gameType}
								/>
							</TableLoading>
						</DataInjector>
					);
				}

				const tabHeader = (key: string, title: string) => {
					return (
						<li
							className={this.state.queryMap.tab === key ? "active" : undefined}
							onClick={() => setQueryMap(this, "tab", key)}
						>
							<a data-toggle="tab" href={"#" + key}>
								{title}
							</a>
						</li>
					);
				};

				const tabClassName = (key: string) => {
					return "tab-pane fade" + (key === this.state.queryMap.tab ? " in active" : "");
				};

				content = [
					<section id="content-header">
						{headerContent}
					</section>,
					<section id="page-content">
						<ul className="nav nav-tabs content-tabs">
							{tabHeader("recommended-decks", "Recommended decks")}
							{tabHeader("turn-stats", "Turn details")}
							{tabHeader("card-stats", "Card stats")}
						</ul>
						<div className="tab-content">
							<div id="recommended-decks" className={tabClassName("recommended-decks")}>
								{recommendedDecks}
							</div>
							<div id="turn-stats" className={tabClassName("turn-stats")}>
								<PremiumWrapper
									isPremium={this.props.user.isPremium()}
									infoHeader="Turn played statistics"
									infoContent="Understand when the card is played and how effective that is, based on turn and opponent."
									iconStyle={{display: "none"}}
								>
									{turnCharts}
								</PremiumWrapper>
							</div>
							<div id="card-stats" className={tabClassName("card-stats")}>
								<div id="card-tables">
									{cardStats}
								</div>
							</div>
						</div>
					</section>,
				];
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
		if (this.props.card && this.props.card.rarity && this.props.card.rarity !== "FREE"
			&& this.props.card.set !== "CORE") {
			craftingCost = (
				<li>
					Cost
					<span className="infobox-value">{getDustCost(this.props.card) + " Dust"}</span>
				</li>
			);
		}

		return <div className="card-detail-container">
			<aside className="infobox">
				<img
					className="card-image"
					src={"https://art.hearthstonejson.com/v1/render/latest/enUS/256x/" + this.props.cardId + ".png"}
				/>
				<p>{this.getCleanFlavorText()}</p>
				<InfoboxFilterGroup
					header="Mode"
					selectedValue={this.state.queryMap["gameType"]}
					onClick={(value) => setQueryMap(this, "gameType", value)}
				>
					<InfoboxFilter disabled={this.props.card && isWildCard(this.props.card)} value="RANKED_STANDARD">
						Ranked Standard
					</InfoboxFilter>
					<InfoboxFilter value="RANKED_WILD">Ranked Wild</InfoboxFilter>
					<InfoboxFilter disabled={this.props.card && isWildCard(this.props.card)} value="ARENA">Arena</InfoboxFilter>
				</InfoboxFilterGroup>
				<h2>Data</h2>
				<ul>
					<li>
						Based on
						<span className="infobox-value">
							<DataInjector
								dataManager={this.dataManager}
								fetchCondition={!!this.props.card}
								query={{url: "single_card_stats_over_time", params: this.getParams()}}
								modify={(data) => {
									if (data) {
										const series = data.series.find((x) => x.metadata.is_winrate_data);
										return toPrettyNumber(series.metadata.num_data_points) + " replays";
									}
									return null;
								}}
							>
								<HideLoading><DataText /></HideLoading>
							</DataInjector>
						</span>
					</li>
					<InfoboxLastUpdated dataManager={this.dataManager} url={"single_card_stats_over_time"} params={this.getParams()} />
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
						<span className="infobox-value">
							{this.props.card && this.props.card.set && setNames[this.props.card.set.toLowerCase()]}
						</span>
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

	mergeHeroes(tableData: TableData): TableData {
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

	getParams(): any {
		return {
			GameType: this.state.queryMap.gameType,
			card_id: this.props.dbfId,
		};
	}
}
