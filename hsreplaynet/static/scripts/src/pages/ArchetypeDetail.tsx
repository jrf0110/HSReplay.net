import { ApiArchetype, DeckObj, SortDirection } from "../interfaces";
import TableLoading from "../components/loading/TableLoading";
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
import CardData from "../CardData";
import * as React from "react";
import ArchetypeMatchups from "../components/archetypedetail/ArchetypeMatchups";
import ArchetypeDistributionPieChart from "../components/archetypedetail/ArchetypeDistributionPieChart";
import WinrateTile from "../components/tiles/WinrateTile";
import PopularityTile from "../components/tiles/PopularityTile";
import MatchupTile from "../components/tiles/MatchupTile";
import DeckTile from "../components/tiles/DeckTile";
import PopularityLineChart from "../components/charts/PopularityLineChart";
import InfoIcon from "../components/InfoIcon";
import WinrateLineChart from "../components/charts/WinrateLineChart";
import {getHeroCardId} from "../helpers";
import RankTile from "../components/tiles/RankTile";
import ArchetypeSignature from "../components/archetypedetail/ArchetypeSignature";
import { extractSignature } from "../extractors";

interface ArchetypeDetailState {
	deckData?: any;
	popularDecks?: DeckObj[];
	popularDecksPage?: number;
	popularDecksSortBy?: string;
	popularDecksSortDirection?: SortDirection;
}

interface ArchetypeDetailProps {
	archetypeId: number;
	archetypeName: string;
	hasStandardData: boolean;
	hasWildData: boolean;
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
			deckData: null,
			popularDecks: [],
			popularDecksPage: 1,
			popularDecksSortBy: "popularity",
			popularDecksSortDirection: "descending",
		};

		this.fixGameTypeFragments();
		this.fetchDeckData(props);
	}

	fixGameTypeFragments() {
		const gameType = this.getGameType();
		if (gameType !== this.props.gameType) {
			this.props.setGameType(gameType);
		}
	}

	fetchDeckData(props: ArchetypeDetailProps) {
		const params = {GameType: this.getGameType(props), RankRange: props.rankRange};
		DataManager.get("list_decks_by_win_rate", params).then((data) => {
			if (data) {
				this.setState({deckData: data.series.data}, () => this.updateData(this.props.cardData));
			}
		});
	}

	updateData(cardData: CardData) {
		const {deckData} = this.state;
		if (!cardData || !deckData) {
			return;
		}
		const {archetypeId, playerClass} = this.props;

		const archetypeDecks = deckData[playerClass].filter((deck) => deck.archetype_id === archetypeId);
		if (!archetypeDecks.length) {
			return;
		}

		const decks: DeckObj[] = archetypeDecks.map((d) => {
			const deck = Object.assign({}, d);
			deck.playerClass = playerClass;
			const cards = JSON.parse(deck["deck_list"]).map((c) => {
				return {card: cardData.fromDbf(c[0]), count: c[1]};
			});
			return {
				archetypeId: deck.archetype_id,
				cards,
				deckId: deck["deck_id"],
				duration: +deck["avg_game_length_seconds"],
				numGames: +deck["total_games"],
				playerClass: deck["playerClass"],
				winrate: +deck["win_rate"],
			};
		});
		this.setState({popularDecks: decks});
	}

	componentWillReceiveProps(nextProps: ArchetypeDetailProps, nextState: ArchetypeDetailState) {
		if (this.getGameType() !== nextProps.gameType || this.props.rankRange !== nextProps.rankRange) {
			this.fetchDeckData(nextProps);
		}
		if (!this.props.cardData && nextProps.cardData) {
			this.updateData(nextProps.cardData);
		}
	}

	render(): JSX.Element {
		const gameType = this.getGameType();
		const {GameType, RankRange, archetype_id} = {
			GameType: gameType, RankRange: this.props.rankRange, archetype_id: this.props.archetypeId,
		};
		const chartParams = {GameType, RankRange, archetype_id};
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
				<section id="info">
					<h2>Data</h2>
					<ul>
						<li>
							Game Type
							<span className="infobox-value">Ranked Standard</span>
						</li>
					</ul>
				</section>
			</aside>
			<main>
				<section id="content-header">
					<div className="container-fluid">
						<div className="row">
							<DataInjector
								query={[
									{key: "chartData", url: "single_archetype_stats_over_time", params: chartParams},
									{key: "matchupData", params, url: "head_to_head_archetype_matchups"},
								]}
								extract={{matchupData: this.extractMatchupData}}
							>
								<WinrateTile
									href="#tab=overtime"
									onClick={() => this.props.setTab("overtime")}
								/>
							</DataInjector>
							<DataInjector
								query={[
									{key: "chartData", url: "single_archetype_stats_over_time", params: chartParams},
									{key: "popularityData", params, url: "archetype_popularity_distribution_stats"},
								]}
								extract={{popularityData: this.extractPopularityData}}
							>
								<PopularityTile
									href="#tab=overtime"
									onClick={() => this.props.setTab("overtime")}
									playerClass={this.props.playerClass}
								/>
							</DataInjector>
							<DataInjector
								query={[
									{key: "matchupData", params, url: "head_to_head_archetype_matchups"},
									{key: "archetypeData", params: {}, url: "/api/v1/archetypes/"},
								]}
								extract={{matchupData: this.matchupTileExtractor(true)}}
							>
								<MatchupTile
									title="Best Matchup"
								/>
							</DataInjector>
							<DataInjector
								query={[
									{key: "matchupData", params, url: "head_to_head_archetype_matchups"},
									{key: "archetypeData", params: {}, url: "/api/v1/archetypes/"},
								]}
								extract={{matchupData: this.matchupTileExtractor(false)}}
							>
								<MatchupTile
									title="Worst Matchup"
								/>
							</DataInjector>
							<DataInjector
								query={{key: "popularityData", params: {}, url: "archetype_popularity_by_rank"}}
								extract={{popularityData: this.rankTileExtractor("win_rate")}}
							>
								<RankTile
									href="/meta/"
									title="Best performing at"
									type="performance"
								/>
							</DataInjector>
							<DataInjector
								query={{key: "popularityData", params: {}, url: "archetype_popularity_by_rank"}}
								extract={{popularityData: this.rankTileExtractor("pct_of_rank")}}
							>
								<RankTile
									href="/meta/#tab=popularity"
									title="Most popular at"
									type="popularity"
								/>
							</DataInjector>
							<DataInjector
								query={[
									{key: "deckData", params, url: "list_decks_by_win_rate"},
									{key: "archetypeData", params: {}, url: "/api/v1/archetypes/" + this.props.archetypeId},
								]}
								extract={{deckData: this.deckTileExtractor("total_games")}}
							>
								<DeckTile
									title="Most popular deck"
								/>
							</DataInjector>
							<DataInjector
								query={[
									{key: "deckData", params, url: "list_decks_by_win_rate"},
									{key: "archetypeData", params: {}, url: "/api/v1/archetypes/" + this.props.archetypeId},
								]}
								extract={{deckData: this.deckTileExtractor("win_rate")}}
							>
								<DeckTile
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
												selectedArchetypeId={this.props.archetypeId}
											/>
										</ChartLoading>
									</DataInjector>
								</div>
							</div>
							<DataInjector
								query={{key: "data", params: {}, url: "/api/v1/archetypes/" + this.props.archetypeId}}
								extract={{data: (data) => extractSignature(data, gameType)}}
							>
								<ArchetypeSignature cardData={this.props.cardData} showOccasional/>
							</DataInjector>
						</Tab>
						<Tab
							label="Matchups"
							id="matchups"
						>
							<DataInjector
								query={[
									{key: "archetypeMatchupData", params, url: "head_to_head_archetype_matchups"},
									{key: "archetypeData", params: {}, url: "/api/v1/archetypes/"},
								]}
							>
								<ArchetypeMatchups
									archetypeId={this.props.archetypeId}
									cardData={this.props.cardData}
								/>
							</DataInjector>
						</Tab>
						<Tab label="Popular Decks" id="similar">
							<DeckList
								decks={this.state.popularDecks}
								pageSize={10}
								hideTopPager
								showArchetypeSelector={true}
								sortBy={this.state.popularDecksSortBy}
								sortDirection={this.state.popularDecksSortDirection}
								setSortBy={(sortBy) => this.setState({popularDecksSortBy: sortBy})}
								setSortDirection={(sortDirection) => this.setState({popularDecksSortDirection: sortDirection})}
								page={this.state.popularDecksPage}
								setPage={(page) => this.setState({popularDecksPage: page})}
							/>
						</Tab>
						<Tab label="Over Time" id="overtime">
							<div className="over-time-chart">
								<AutoSizer>
									{({width}) => (
										<div>
											<DataInjector
												query={{url: "single_archetype_stats_over_time", params: chartParams}}
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
												content="Percentage of all decks that are classified as this archetype."
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
												query={{url: "single_archetype_stats_over_time", params: chartParams}}
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
												header="Winrate over time"
												content="Percentage of games won with this archetype."
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

	getGameType(props?: ArchetypeDetailProps): string {
		const {gameType, hasWildData, hasStandardData} = props || this.props;
		if (!hasStandardData && !hasWildData) {
			return "RANKED_STANDARD";
		}
		if (gameType === "RANKED_WILD" && hasWildData || gameType === "RANKED_STANDARD" && !hasStandardData) {
			return "RANKED_WILD";
		}
		return "RANKED_STANDARD";
	}

	extractMatchupData = (matchupData) => {
		const data = matchupData.series.metadata["" + this.props.archetypeId];
		if (data) {
			return {games: data.total_games, winrate: data.win_rate};
		}
	}

	extractPopularityData = (popularityData) => {
		const classData = popularityData.series.data[this.props.playerClass];
		const archetype = classData && classData.find((a) => a.archetype_id === this.props.archetypeId);
		if (archetype) {
			return {popularity: archetype.pct_of_class};
		}
	}

	matchupTileExtractor(best: boolean) {
		return (matchupData, props) => {
			if (!props.archetypeData) {
				return;
			}
			const matchups = matchupData.series.data["" + this.props.archetypeId];
			if (matchups) {
				const data = Object.keys(matchups).map((id) => {
					const opponentData: ApiArchetype = props.archetypeData.find((archetype) => archetype.id === +id);
					if (opponentData) {
						return {
							archetypeId: +id,
							archetypeName: opponentData.name,
							games: matchups[id].total_games,
							playerClass: opponentData.player_class_name,
							winrate: matchups[id].win_rate,
						};
					}
				}).filter((x) => x !== undefined);
				data.sort((a, b) => b.winrate - a.winrate);
				const index = best ? 0 : data.length - 1;
				return {...data[index]};
			}
		};
	}

	rankTileExtractor(sortProp: string) {
		return (popularityData) => {
			const data = popularityData.series.data;
			const rankData = Object.keys(data).map((rank) => {
				if (+rank <= 20) {
					return data[rank].find((archetype) => archetype.archetype_id === this.props.archetypeId);
				}
			}).filter((x) => x !== undefined);
			if (rankData.length) {
				rankData.sort((a, b) => b[sortProp] - a[sortProp] || (a.rank - b.rank));
				return {
					popularity: rankData[0].pct_of_rank,
					rank: rankData[0].rank,
					winrate: rankData[0].win_rate,
				};
			}
		};
	}

	deckTileExtractor(sortProp: string) {
		return (deckData, props) => {
			const {cardData, playerClass, archetypeId} = this.props;
			const gameType = this.getGameType();

			if (!cardData || !props.archetypeData) {
				return;
			}
			const classDecks = deckData.series.data[playerClass];
			if (!classDecks) {
				return;
			}
			const signatureData = extractSignature(props.archetypeData, gameType);
			if (!signatureData) {
				return;
			}

			const decks = classDecks.filter((deck) => deck.archetype_id === archetypeId);
			if (decks.length > 0) {
				decks.sort((a, b) => {
					return b[sortProp] - a[sortProp] || (a.deck_id > b.deck_id ? 1 : -1);
				});
				const prevalences = signatureData.signature.components.slice().map(([dbfId, prevalence]) => {
					return {card: cardData.fromDbf(dbfId), prevalence};
				}).sort((a, b) => {
					return a.prevalence - b.prevalence || (a.card.name > b.card.name ? 1 : -1);
				});
				const deckCards = JSON.parse(decks[0].deck_list).map((c) => c[0]);
				const dbfIds = [];
				prevalences.forEach(({card}) => {
					if (deckCards.indexOf(card.dbfId) !== -1 && dbfIds.length < 4) {
						dbfIds.push(card.dbfId);
					}
				});
				const cards = dbfIds.map((dbfId) => cardData.fromDbf(dbfId));
				return {
					cards,
					deckId: decks[0].deck_id,
					games: decks[0].total_games,
					winrate: decks[0].win_rate,
				};
			}
		};
	}
}
