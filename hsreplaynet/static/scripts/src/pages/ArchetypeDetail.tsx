
import CardData from "../CardData";
import * as React from "react";
import DataManager from "../DataManager";
import UserData from "../UserData";
import TabList from "../components/layout/TabList";
import Tab from "../components/layout/Tab";
import DataInjector from "../components/DataInjector";
import ChartLoading from "../components/loading/ChartLoading";
import PopularityLineChart from "../components/charts/PopularityLineChart";
import InfoIcon from "../components/InfoIcon";
import WinrateLineChart from "../components/charts/WinrateLineChart";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import InfoboxFilter from "../components/InfoboxFilter";
import { getPlayerClassFromId, toTitleCase } from "../helpers";
import PremiumWrapper from "../components/PremiumWrapper";
import DeckList from "../components/DeckList";
import { DeckObj } from "../interfaces";
import CardList from "../components/CardList";

interface ArchetypeData {
	id: number;
	name: string;
	player_class: number;
	core?: number[];
	tech1?: number[];
	tech2?: number[];
}

interface DecksByArchetype {
	[id: number]: any[];
}

interface ArchetypeDetailState {
	activeArchetypes?: ArchetypeData[];
	archetypeData?: ArchetypeData[];
	deckData?: any;
	decksByArchetype?: DecksByArchetype;
	selectedArchetype?: number;
}

interface ArchetypeDetailProps {
	archetype?: number;
	setArchetype?: (archetype: number) => void;
	cardData: CardData;
	gameType?: string;
	setGameType?: (gameType: string) => void;
	rankRange?: string;
	setRankRange?: (rankRange: string) => void;
	user: UserData;
	tab?: string;
	setTab?: (tab: string) => void;
}

export default class ArchetypeDetail extends React.Component<ArchetypeDetailProps, ArchetypeDetailState> {
	private readonly dataManager: DataManager = new DataManager();

	constructor(props: ArchetypeDetailProps, state: ArchetypeDetailState) {
		super(props, state);
		this.state = {
			activeArchetypes: null,
			archetypeData: null,
			deckData: null,
			decksByArchetype: null,
			selectedArchetype: 0,
		};

		this.fetchArchetypeData();
		this.fetchDeckData();
	}

	fetchArchetypeData() {
		this.dataManager.get("/api/v1/archetypes/").then((data) => {
			if (data && data.results) {
				const archetypeData = data.results.filter((x) => !x.name.startsWith("Basic")).sort((a, b) => {
					if (a.player_class === b.player_class) {
						return a.name > b.name ? 1 : -1;
					}
					return a.player_class - b.player_class;
				});
				this.setState({archetypeData});
				this.updateActiveArchetypes();
			}
		});
	}

	fetchDeckData() {
		const params = {GameType: this.props.gameType, RankRange: this.props.rankRange, TimeRange: "LAST_30_DAYS"};
		this.dataManager.get("list_decks_by_win_rate", params).then((data) => {
			if (data && data.series.data) {
				const decksByArchetype: DecksByArchetype = {};
				Object.keys(data.series.data).forEach((playerClass) => {
					data.series.data[playerClass].forEach((deck) => {
						deck.playerClass = playerClass;
						deck.cards = JSON.parse(deck["deck_list"]);
						if (!decksByArchetype[deck.archetype_id]) {
							decksByArchetype[deck.archetype_id] = [];
						}
						decksByArchetype[deck.archetype_id].push(deck);
					});
				});
				this.setState({deckData: data.series.data, decksByArchetype});
				this.updateActiveArchetypes();
			}
		});
	}

	updateActiveArchetypes() {
		if (!this.state.deckData || !this.state.archetypeData) {
			return;
		}

		const activeArchetypes = this.state.archetypeData.filter((archetype) => {
			return Object.keys(this.state.deckData).some((playerClass) => {
				return this.state.deckData[playerClass].some((deck) => {
					return deck.archetype_id === archetype.id;
				});
			});
		});

		activeArchetypes.forEach((archetype) => {
			const counts = {};
			const decks = this.state.decksByArchetype[archetype.id];
			decks.forEach((deck) => {
				deck.cards.forEach((card) => {
					counts[card[0]] = (counts[card[0]] || 0) + 1;
				});
			});
			archetype.core = [];
			archetype.tech1 = [];
			archetype.tech2 = [];
			const cards = Object.keys(counts);
			cards.forEach((dbfId) => {
				const prevalence = counts[dbfId] / decks.length;
				if (prevalence >= 0.8) {
					archetype.core.push(+dbfId);
				}
				else if (prevalence >= 0.6) {
					archetype.tech1.push(+dbfId);
				}
				else if (prevalence >= 0.3) {
					archetype.tech2.push(+dbfId);
				}
			});
		});

		if (!activeArchetypes.some((archetype) => archetype.id === this.props.archetype)) {
			this.props.setArchetype(activeArchetypes[0].id);
		}

		this.setState({activeArchetypes});
	}

	componentWillReceiveProps(nextProps: ArchetypeDetailProps, nextState: ArchetypeDetailState) {
	}

	componentDidUpdate(prevProps: ArchetypeDetailProps, prevState: ArchetypeDetailState) {
	}

	render(): JSX.Element {
		if (this.props.cardData) {
		}

		let chartsDeckId = null;
		let popularDecksList = null;
		let selectedArchetype = null;

		let archetypes = [];
		if (this.state.activeArchetypes) {
			archetypes = this.state.activeArchetypes.map((archetype) => {
				const playerClass = getPlayerClassFromId(archetype.player_class).toLowerCase();
				return (
					<InfoboxFilter value={"" + archetype.id}>
						<img
							alt={toTitleCase(playerClass)}
							className="player-class-icon"
							src={STATIC_URL + `images/64x/class-icons/${playerClass}.png`}
						/>
						{archetype.name}
					</InfoboxFilter>
				);
			});

			if (this.props.archetype > 0) {

				selectedArchetype = this.state.activeArchetypes.find((a) => a.id === this.props.archetype);

				const decks = this.state.decksByArchetype[this.props.archetype];
				decks.sort((a, b) => b.total_games - a.total_games);
				if (decks.length) {
					chartsDeckId = decks[0].deck_id;
				}
				if (this.props.cardData) {
					const deckObjs: DeckObj[] = [];
					decks.forEach((deck) => {
						const cardData = deck.cards.map((c) => {return {card: this.props.cardData.fromDbf(c[0]), count: c[1]}; });
						deckObjs.push({
							cards: cardData,
							deckId: deck["deck_id"],
							duration: +deck["avg_game_length_seconds"],
							numGames: +deck["total_games"],
							playerClass: deck["playerClass"],
							winrate: +deck["win_rate"],
						});
					});

					popularDecksList = (
						<DeckList
							decks={deckObjs}
							pageSize={10}
							hideTopPager
						/>
					);
				}
			}
		}

		return <div className="archetype-detail-container">
			<aside className="infobox">
				<h1>Archetype Detail</h1>
				<section id="rank-range-filter">
					<PremiumWrapper
						name="Deck List Rank Range"
						isPremium={this.props.user.isPremium()}
						infoHeader="Rank Range"
						infoContent="Ready to climb the ladder? Check out how decks perform at certain rank ranges!"
					>
						<h2>Rank range</h2>
						<InfoboxFilterGroup
							locked={!this.props.user.isPremium()}
							selectedValue={this.props.rankRange}
							onClick={(value) => this.props.setRankRange(value)}
							tabIndex={0} // TODO
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
				<section id="archetypes">
					<h2>Archetypes</h2>
					<InfoboxFilterGroup
						selectedValue={"" + this.props.archetype}
						onClick={(value) => this.props.setArchetype(+value)}
					>
						{archetypes}
					</InfoboxFilterGroup>
				</section>
			</aside>
			<main>
				<section id="content-header">
					<div className="col-lg-6 col-md-6">
						<div className="chart-wrapper wide">
							<DataInjector
								dataManager={this.dataManager}
								fetchCondition={!!chartsDeckId}
								query={{url: "single_deck_stats_over_time", params: {GameType: "RANKED_STANDARD", RankRange: "ALL", deck_id: chartsDeckId}}}
							>
								<ChartLoading>
									<PopularityLineChart
										widthRatio={2}
										maxYDomain={10}
									/>
								</ChartLoading>
							</DataInjector>
							<InfoIcon
								header="Popularity over time"
								content="Percentage of games played with this deck."
							/>
						</div>
					</div>
					<div className="col-lg-6 col-md-6">
						<div className="chart-wrapper wide">
							<DataInjector
								dataManager={this.dataManager}
								fetchCondition={!!chartsDeckId}
								query={{url: "single_deck_stats_over_time", params: {GameType: "RANKED_STANDARD", RankRange: "ALL", deck_id: chartsDeckId}}}
							>
								<ChartLoading>
									<WinrateLineChart widthRatio={2} />
								</ChartLoading>
							</DataInjector>
							<InfoIcon
								header="Winrate over time"
								content="Percentage of games won with this deck."
							/>
						</div>
					</div>,
				</section>
				<section id="page-content">
					<TabList tab={this.props.tab} setTab={this.props.setTab}>
						<Tab label="Overview" id="overview">
							<div className="col-lg-3 col-md-6 col-sm-12 col-xs-12 col-lg-offset-3">
								<div className="card-list-wrapper">
									<h3>Core Cards</h3>
									<CardList
										cardData={this.props.cardData}
										cardList={selectedArchetype ? selectedArchetype.core : []}
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
										cardList={selectedArchetype ? selectedArchetype.tech1 : []}
										name=""
										heroes={[]}
									/>
									<h4>Occasional</h4>
									<CardList
										cardData={this.props.cardData}
										cardList={selectedArchetype ? selectedArchetype.tech2 : []}
										name=""
										heroes={[]}
									/>
								</div>
							</div>
						</Tab>
						<Tab label="Popular Decks" id="similar">
							{popularDecksList}
						</Tab>
					</TabList>
				</section>
			</main>
		</div>;
	}
}
;
;
;
