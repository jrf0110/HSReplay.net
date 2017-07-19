import { DeckObj } from "../interfaces";
import CardData from "../CardData";
import {AutoSizer} from "react-virtualized";
import DataManager from "../DataManager";
import UserData from "../UserData";
import TabList from "../components/layout/TabList";
import Tab from "../components/layout/Tab";
import DataInjector from "../components/DataInjector";
import ChartLoading from "../components/loading/ChartLoading";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import InfoboxFilter from "../components/InfoboxFilter";
import PremiumWrapper from "../components/PremiumWrapper";
import DeckList from "../components/DeckList";
import * as React from "react";
import TableLoading from "../components/loading/TableLoading";
import ArchetypeMatchups from "../components/archetypedetail/ArchetypeMatchups";
import ArchetypeDistributionPieChart from "../components/archetypedetail/ArchetypeDistributionPieChart";
import WinrateTile from "../components/tiles/WinrateTile";
import PopularityTile from "../components/tiles/PopularityTile";
import MatchupTile from "../components/tiles/MatchupTile";
import DeckTile from "../components/tiles/DeckTile";
import PopularityLineChart from "../components/charts/PopularityLineChart";
import InfoIcon from "../components/InfoIcon";
import WinrateLineChart from "../components/charts/WinrateLineChart";
import { getHeroCardId } from "../helpers";
import CardList from "../components/CardList";

export interface Signature {
	core?: number[];
	tech1?: number[];
	tech2?: number[];
	prevalences?: any[];
}

interface ArchetypeDetailState {
	deckData?: any;
	chartsDeckId?: string;
	popularDecks?: DeckObj[];
	signature?: Signature;
}

interface ArchetypeDetailProps {
	archetypeId: number;
	archetypeName: string;
	playerClass: string;
	cardData: CardData;
	gameType?: string;
	setGameType?: (gameType: string) => void;
	rankRange?: string;
	setRankRange?: (rankRange: string) => void;
	tab?: string;
	setTab?: (tab: string) => void;
}

export default class ArchetypeDetail extends React.Component<ArchetypeDetailProps, ArchetypeDetailState> {
	constructor(props: ArchetypeDetailProps, state: ArchetypeDetailState) {
		super(props, state);
		this.state = {
			chartsDeckId: "",
			deckData: null,
			popularDecks: [],
			signature: {core: [], tech1: [], tech2: [], prevalences: []},
		};

		this.fetchDeckData(props);
	}

	fetchDeckData(props: ArchetypeDetailProps) {
		const params = {GameType: props.gameType, RankRange: props.rankRange};
		DataManager.get("list_decks_by_win_rate", params).then((data) => {
			if (data) {
				this.setState({deckData: data.series.data}, () => this.updateData());
			}
		});
	}

	updateData() {
		const signature = {core: [], tech1: [], tech2: [], prevalences: []};
		const decks = [];
		const deckObjs: DeckObj[] = [];

		Object.keys(this.state.deckData).forEach((playerClass) => {
			this.state.deckData[playerClass].forEach((deck) => {
				if (deck.archetype_id === this.props.archetypeId) {
					const d = Object.assign({}, deck);
					d.playerClass = playerClass;
					d.cards = JSON.parse(d["deck_list"]);
					decks.push(d);
				}
			});
		});

		if (decks.length === 0) {
			return;
		}

		decks.sort((a, b) => b.total_games - a.total_games);

		const cardCounts = {};
		decks.forEach((deck) => {
			deck.cards.forEach((card) => {
				cardCounts[card[0]] = (cardCounts[card[0]] || 0) + 1;
			});
		});
		Object.keys(cardCounts).forEach((dbfId) => {
			const prevalence = cardCounts[dbfId] / decks.length;
			if (prevalence >= 0.8) {
				signature.core.push(+dbfId);
			}
			else if (prevalence >= 0.6) {
				signature.tech1.push(+dbfId);
			}
			else if (prevalence >= 0.3) {
				signature.tech2.push(+dbfId);
			}
			signature.prevalences.push({dbfId, prevalence});
		});

		if (this.props.cardData) {
			decks.forEach((deck) => {
				const cardData = deck.cards.map((c) => {return {card: this.props.cardData.fromDbf(c[0]), count: c[1]}; });
				deckObjs.push({
					archetypeId: deck.archetype_id,
					cards: cardData,
					deckId: deck["deck_id"],
					duration: +deck["avg_game_length_seconds"],
					numGames: +deck["total_games"],
					playerClass: deck["playerClass"],
					winrate: +deck["win_rate"],
				});
			});
		}

		this.setState({
			chartsDeckId: decks && decks.length && decks[0].deck_id,
			popularDecks: deckObjs,
			signature,
		});
	}

	componentWillReceiveProps(nextProps: ArchetypeDetailProps, nextState: ArchetypeDetailState) {
		if (this.props.gameType !== nextProps.gameType || this.props.rankRange !== nextProps.rankRange) {
			this.fetchDeckData(nextProps);
		}
		if (!this.props.cardData && nextProps.cardData && this.state.deckData) {
			this.updateData();
		}
	}

	render(): JSX.Element {
		const {GameType, RankRange, deck_id} = {
			GameType: this.props.gameType, RankRange: this.props.rankRange, deck_id: this.state.chartsDeckId,
		};
		const chartParams = {GameType, RankRange, deck_id};
		const params = {GameType, RankRange};

		return <div className="archetype-detail-container">
			<aside className="infobox">
				<h1>{this.props.archetypeName}</h1>
				<img
					className="hero-image"
					src={"https://art.hearthstonejson.com/v1/256x/" + getHeroCardId(this.props.playerClass, true) + ".jpg"}
				/>
				<section id="rank-range-filter">
					<PremiumWrapper
						name="Deck List Rank Range"
						infoHeader="Rank Range"
						infoContent="Ready to climb the ladder? Check out how decks perform at certain rank ranges!"
					>
						<h2>Rank range</h2>
						<InfoboxFilterGroup
							selectedValue={this.props.rankRange}
							onClick={(value) => this.props.setRankRange(value)}
							tabIndex={0}
						>
							<InfoboxFilter value="LEGEND_ONLY">Legend only</InfoboxFilter>
							<InfoboxFilter value="LEGEND_THROUGH_FIVE">Legend–5</InfoboxFilter>
							<InfoboxFilter value="LEGEND_THROUGH_TEN">Legend–10</InfoboxFilter>
							<InfoboxFilter value="ALL">Legend–25</InfoboxFilter>
						</InfoboxFilterGroup>
					</PremiumWrapper>
				</section>
				<section id="game-mode-filter">
					<h2>Game Mode</h2>
					<InfoboxFilterGroup
						selectedValue={this.props.gameType}
						onClick={(value) => this.props.setGameType(value)}
					>
						<InfoboxFilter value="RANKED_STANDARD">Ranked Standard</InfoboxFilter>
						<InfoboxFilter value="RANKED_WILD">Ranked Wild</InfoboxFilter>
					</InfoboxFilterGroup>
				</section>
			</aside>
			<main>
				<section id="content-header">
					<div className="container-fluid">
						<div className="row">
							<DataInjector
								fetchCondition={!!this.state.chartsDeckId}
								query={{key: "chartData", url: "single_deck_stats_over_time", params: chartParams}}
							>
								<WinrateTile winrate={51.42} />
							</DataInjector>
							<DataInjector
								fetchCondition={!!this.state.chartsDeckId}
								query={[
									{key: "chartData", url: "single_deck_stats_over_time", params: chartParams},
									{key: "popularityData", params, url: "archetype_popularity_distribution_stats"},
								]}
							>
								<PopularityTile
									archetypeId={this.props.archetypeId}
									playerClass={this.props.playerClass}
								/>
							</DataInjector>
							<DataInjector
								query={[
									{key: "matchupData", params, url: "head_to_head_archetype_matchups"},
									{key: "archetypeData", params: {}, url: "/api/v1/archetypes"},
								]}
							>
								<MatchupTile
									archetypeId={this.props.archetypeId}
									matchup="best"
									title="Best Matchup"
								/>
							</DataInjector>
							<DataInjector
								query={[
									{key: "matchupData", params, url: "head_to_head_archetype_matchups"},
									{key: "archetypeData", params: {}, url: "/api/v1/archetypes"},
								]}
							>
								<MatchupTile
									archetypeId={this.props.archetypeId}
									matchup="worst"
									title="Worst Matchup"
								/>
							</DataInjector>
							<DataInjector
								query={{key: "deckData", params, url: "list_decks_by_win_rate"}}
							>
								<DeckTile
									archetypeId={this.props.archetypeId}
									bestProp={"popularity"}
									cardData={this.props.cardData}
									playerClass={this.props.playerClass}
									signature={this.state.signature}
									title="Most popular deck"
								/>
							</DataInjector>
							<DataInjector
								query={{key: "deckData", params, url: "list_decks_by_win_rate"}}
							>
								<DeckTile
									archetypeId={this.props.archetypeId}
									bestProp={"winrate"}
									cardData={this.props.cardData}
									playerClass={this.props.playerClass}
									signature={this.state.signature}
									title="Best performing deck"
								/>
							</DataInjector>
						</div>
					</div>
				</section>
				<section id="page-content">
					<TabList tab={this.props.tab} setTab={this.props.setTab}>
						<Tab label="Overview" id="overview">
							<div className="col-lg-4 col-md-6 col-sm-12 col-xs-12">
								<div className="archetype-chart">
									<DataInjector
										query={[
											{key: "matchupData", params, url: "archetype_popularity_distribution_stats"},
											{key: "archetypeData", params: {}, url: "/api/v1/archetypes/"},
										]}
									>
										<ChartLoading
											dataKeys={["matchupData", "archetypeData"]}
											noDataCondition={(data) => !data}
										>
											<ArchetypeDistributionPieChart
												playerClass={this.props.playerClass}
												selectedArchetypeId={"" + this.props.archetypeId}
											/>
										</ChartLoading>
									</DataInjector>
								</div>
							</div>
							<div className="col-lg-3 col-md-6 col-sm-12 col-xs-12">
								<div className="card-list-wrapper">
									<h3>Core Cards</h3>
									<CardList
										cardData={this.props.cardData}
										cardList={this.state.signature.core}
										name=""
										heroes={[]}
									/>
								</div>
							</div>
							<div className="col-lg-3 col-md-6 col-sm-12 col-xs-12">
								<div className="card-list-wrapper">
									<h3>Tech Choices</h3>
									<h4>Popular</h4>
									<CardList
										cardData={this.props.cardData}
										cardList={this.state.signature.tech1}
										name=""
										heroes={[]}
									/>
									<h4>Occasional</h4>
									<CardList
										cardData={this.props.cardData}
										cardList={this.state.signature.tech2}
										name=""
										heroes={[]}
									/>
								</div>
							</div>
						</Tab>
						<Tab
							label="Matchups"
							id="matchups"
							hidden={!UserData.hasFeature("deck-matchups")}
						>
							<DataInjector
								query={[
									{key: "archetypeMatchupData", params, url: "head_to_head_archetype_matchups"},
									{key: "archetypeData", params: {}, url: "/api/v1/archetypes/"},
								]}
							>
								<TableLoading dataKeys={["archetypeMatchupData", "archetypeData"]}>
									<ArchetypeMatchups archetypeId={this.props.archetypeId}/>
								</TableLoading>
							</DataInjector>
						</Tab>
						<Tab label="Popular Decks" id="similar">
							<DeckList
								decks={this.state.popularDecks}
								pageSize={10}
								hideTopPager
								showArchetypeSelector={true}
							/>
						</Tab>
						<Tab label="Over time data" id="overtime">
							<div className="over-time-chart">
								<AutoSizer>
									{({width}) => (
										<div>
											<DataInjector
												fetchCondition={!!this.state.chartsDeckId}
												query={{url: "single_deck_stats_over_time", params: chartParams}}
											>
												<ChartLoading>
													<PopularityLineChart
														maxYDomain={10}
														width={width}
														height={300}
														absolute
													/>
												</ChartLoading>
											</DataInjector>
											<InfoIcon
												header="Popularity over time"
												content="Percentage of games played with this deck."
											/>
										</div>
									)}
								</AutoSizer>
							</div>
							<div className="over-time-chart">
								<AutoSizer>
									{({width}) => (
										<div>
											<DataInjector
												fetchCondition={!!this.state.chartsDeckId}
												query={{url: "single_deck_stats_over_time", params: chartParams}}
											>
												<ChartLoading>
													<WinrateLineChart
														width={width}
														height={300}
														absolute
													/>
												</ChartLoading>
											</DataInjector>
											<InfoIcon
												header="Popularity over time"
												content="Percentage of games played with this deck."
											/>
										</div>
									)}
								</AutoSizer>
							</div>
						</Tab>
					</TabList>
				</section>
			</main>
		</div>;
	}
}
