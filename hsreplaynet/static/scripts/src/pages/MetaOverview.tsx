
import PremiumWrapper from "../components/PremiumWrapper";
import InfoboxFilter from "../components/InfoboxFilter";
import DataManager from "../DataManager";
import UserData from "../UserData";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import * as React from "react";
import CardData from "../CardData";
import DataInjector from "../components/DataInjector";
import ArchetypeHeadToHead from "../components/metaoverview/ArchetypeHeadToHead";
import { SortDirection } from "../interfaces";
import TabList from "../components/layout/TabList";
import Tab from "../components/layout/Tab";
import ArchetypePopularity from "../components/metaoverview/popularity/ArchetypePopularity";

export interface EvaluatedArchetype {
	[archetype: string]: number;
}

interface MetaOverviewState {
	popularities?: EvaluatedArchetype;
	winrates?: any;
	expected_winrates?: EvaluatedArchetype;
	sampleSize?: number;
	hasChangedSampleSize?: boolean;
	smallestRank?: number;
	largestRank?: number;
	fetching?: boolean;
	archetypes?: any[];
	selectedArchetype?: string;
	visibleNonce?: number;
	lookback?: number;
	offset?: number;
	max_games_per_archetype?: EvaluatedArchetype;
	games_per_archetype?: EvaluatedArchetype;
}

interface MetaOverviewProps {
	cardData: CardData;
	popularitySortBy?: string;
	setPopularitySortBy?: (popularitySortBy: string) => void;
	popularitySortDirection?: SortDirection;
	setPopularitySortDirection?: (ascending: SortDirection) => void;
	sortDirection?: SortDirection;
	setSortDirection?: (ascending: SortDirection) => void;
	sortBy?: string;
	setSortBy?: (sortBy: string) => void;
	gameType?: string;
	setGameType?: (gameType: string) => void;
	rankRange?: string;
	setRankRange?: (rankRange: string) => void;
	timeFrame?: string;
	setTimeFrame?: (timeFrame: string) => void;
	tab?: string;
	setTab?: (tab: string) => void;
}

export default class MetaOverview extends React.Component<MetaOverviewProps, MetaOverviewState> {
	private samplesPerDay: number;
	private nonce: number;

	constructor(props: MetaOverviewProps, context: any) {
		super(props, context);
		this.state = {
			popularities: {},
			winrates: {},
			expected_winrates: {},
			sampleSize: 100,
			hasChangedSampleSize: false,
			smallestRank: 0,
			largestRank: 20,
			fetching: true,
			archetypes: [],
			selectedArchetype: null,
			visibleNonce: 0,
			lookback: 7,
			offset: 0,
			games_per_archetype: {},
			max_games_per_archetype: {},
		};
		this.nonce = 0;
		this.samplesPerDay = this.state.sampleSize / this.state.lookback;
	}

	fetchArchetypeData() {
		DataManager.get("head_to_head_archetype_matchups").then((data) => {
			if (data && data.results) {
				const archetypeData = data.results.filter((x) => !x.name.startsWith("Basic")).sort((a, b) => {
					if (a.player_class === b.player_class) {
						return a.name > b.name ? 1 : -1;
					}
					return a.player_class - b.player_class;
				});
			}
		});
	}

	render(): JSX.Element {
		const params = {
			GameType: this.props.gameType,
			RankRange: this.props.rankRange,
			TimeRange: this.props.timeFrame,
		};

		const popularityParams = {
			GameType: this.props.gameType,
			TimeRange: this.props.timeFrame,
		};

		return <div className="meta-overview-container">
			<aside className="infobox">
				<h1>Meta Overview</h1>
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
				<section id="time-frame-filter">
					<PremiumWrapper>
						<h2>Time Frame</h2>
						<InfoboxFilterGroup
							selectedValue={this.props.timeFrame}
							onClick={(value) => this.props.setTimeFrame(value)}
						>
							<InfoboxFilter value="LAST_3_DAYS">Last 3 days</InfoboxFilter>
							<InfoboxFilter value="LAST_7_DAYS">Last 7 days</InfoboxFilter>
							<InfoboxFilter value="LAST_14_DAYS">Last 14 days</InfoboxFilter>
						</InfoboxFilterGroup>
					</PremiumWrapper>
				</section>
				<section id="rank-range-filter">
					<PremiumWrapper>
						<h2>Rank range</h2>
						<InfoboxFilterGroup
							locked={!UserData.isPremium()}
							selectedValue={this.props.rankRange}
							onClick={(value) => this.props.setRankRange(value)}
							tabIndex={0}
							disabled={this.props.tab === "popularity"}
						>
							<InfoboxFilter value="LEGEND_ONLY">Legend only</InfoboxFilter>
							<InfoboxFilter value="LEGEND_THROUGH_FIVE">Legend–5</InfoboxFilter>
							<InfoboxFilter value="LEGEND_THROUGH_TEN">Legend–10</InfoboxFilter>
							<InfoboxFilter value="ALL">Legend–25</InfoboxFilter>
						</InfoboxFilterGroup>
					</PremiumWrapper>
				</section>
			</aside>
			<main>
				<TabList tab={this.props.tab} setTab={(tab) => this.props.setTab(tab)}>
					<Tab id="matchups" label="Matchups">
						<DataInjector
							query={[
								{key: "archetypeData", params: {}, url: "/api/v1/archetypes/"},
								{key: "matchupData", params, url: "head_to_head_archetype_matchups"},
								{key: "popularityData", params, url: "archetype_popularity_distribution_stats"},
							]}
						>
							<ArchetypeHeadToHead
								cardData={this.props.cardData}
								sortDirection={this.props.sortDirection}
								setSortDirection={this.props.setSortDirection}
								sortBy={this.props.sortBy}
								setSortBy={this.props.setSortBy}
							/>
						</DataInjector>
					</Tab>
					<Tab id="popularity" label="Popularity">
						<DataInjector
							query={[
								{key: "archetypeData", params: {}, url: "/api/v1/archetypes/"},
								{key: "popularityData", params: popularityParams, url: "archetype_popularity_by_rank"},
							]}
						>
							<ArchetypePopularity
								cardData={this.props.cardData}
								sortDirection={this.props.sortDirection}
								setSortDirection={this.props.setSortDirection}
								sortBy={this.props.popularitySortBy}
								setSortBy={this.props.setPopularitySortBy}
							/>
						</DataInjector>
					</Tab>
				</TabList>
			</main>
		</div>;
	}

	private renderDecklist(): JSX.Element {
		const key = this.state.selectedArchetype;

		if (!key) {
			return <p className="text-center">Select an Archetype…</p>;
		}
		if (!this.props.cardData) {
			return <p className="text-center">Loading cards…</p>;
		}

		const archetype = this.state.archetypes.find((archetype: any) => archetype.name === key);

		if (!archetype || !archetype.representative_deck) {
			return <div className="alert alert-error" role="alert">Missing Archetype data</div>;
		}

		let winrate = this.state.expected_winrates && this.state.expected_winrates[key] ? (this.state.expected_winrates[key] * 100).toFixed(2) : null;
		let popularity = this.state.popularities && this.state.popularities[key] ? (this.state.popularities[key] * 100).toFixed(1) : null;

		if (popularity && this.state.popularities[key] < 0.001) {
			popularity = "<0.1";
		}

		return <div className="text-center">
			<h3 className="text-center">Details</h3>
			<ul className="list-group text-left">
				<li className="list-group-item">
					<span className="badge badge-blue">{+this.state.games_per_archetype[key]}</span>
					Games
				</li>
				<li className="list-group-item">
					<span className="badge badge-blue">{popularity ? popularity + "%" : "unknown"}</span>
					Popularity
				</li>
				<li className="list-group-item">
					<span className="badge badge-blue">{winrate ? winrate + "%" : "unknown"}</span>
					Expected Winrate
				</li>
			</ul>
			<h3 className="text-center">Decklist</h3>
			{/*TODO: update cardlist to use dbfids*/}
			{/*<CardList
				cardDb={this.props.cardData}
				cards={archetype.representative_deck.card_ids}
				name={archetype.name}
				class=""
			/>*/}
		</div>;
	}
}
