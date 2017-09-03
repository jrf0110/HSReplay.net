import PremiumWrapper from "../components/PremiumWrapper";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import * as React from "react";
import CardData from "../CardData";
import DataInjector from "../components/DataInjector";
import ArchetypeMatchups from "../components/metaoverview/ArchetypeMatchups";
import { SortDirection } from "../interfaces";
import TabList from "../components/layout/TabList";
import Tab from "../components/layout/Tab";
import ArchetypePopularity from "../components/metaoverview/ArchetypePopularity";
import RankRangeFilter from "../components/RankRangeFilter";
import Feature from "../components/Feature";
import UserData from "../UserData";
import ArchetypeList from "../components/metaoverview/ArchetypeList";
import InfoboxLastUpdated from "../components/InfoboxLastUpdated";

interface MetaOverviewState {
	mobileView?: boolean;
	archetypeListSortBy: string;
	archetypeListSortDirection: SortDirection;
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
	timeFrame?: string;
	setTimeFrame?: (timeFrame: string) => void;
	tab?: string;
	setTab?: (tab: string) => void;
	rankRange?: string;
	setRankRange?: (rankRange: string) => void;
	region?: string;
	setRegion?: (region: string) => void;
}

const mobileWidth = 530;

export default class MetaOverview extends React.Component<MetaOverviewProps, MetaOverviewState> {

	constructor(props: MetaOverviewProps, context: any) {
		super(props, context);
		this.state = {
			archetypeListSortBy: "archetype",
			archetypeListSortDirection: "ascending",
			mobileView: window.innerWidth <= mobileWidth,
		};
	}

	getParams(): any {
		return {
			GameType: this.props.gameType,
			RankRange: this.props.rankRange,
			Region: this.props.region,
			TimeRange: this.props.timeFrame,
		};
	}

	getPopularityParams(): any {
		return {
			GameType: this.props.gameType,
			Region: this.props.region,
			TimeRange: this.props.timeFrame,
		};
	}

	render(): JSX.Element {
		const params = this.getParams();
		const popularityParams = this.getPopularityParams();

		let content = null;

		const archetypeList = (
			<DataInjector
				query={[
					{key: "archetypeData", params: {}, url: "/api/v1/archetypes/"},
					{params, url: "archetype_popularity_distribution_stats"},
				]}
				extract={{
					data: (data) => ({data: data.series.data}),
				}}
			>
				<ArchetypeList
					sortBy={this.state.archetypeListSortBy}
					sortDirection={this.state.archetypeListSortDirection}
					onSortChanged={(archetypeListSortBy, archetypeListSortDirection) => {
						this.setState({archetypeListSortBy, archetypeListSortDirection});
					}}
					gameType={this.props.gameType}
					cardData={this.props.cardData}
				/>
			</DataInjector>
		);

		if (this.state.mobileView) {
			content = <div id="archetypes">{archetypeList}</div>;
		}
		else {
			content = (
				<TabList tab={this.props.tab} setTab={(tab) => this.props.setTab(tab)}>
					<Tab id="archetypes" label="Archetypes">
						{archetypeList}
					</Tab>
					<Tab id="matchups" label="Matchups">
						<DataInjector
							query={[
								{key: "archetypeData", params: {}, url: "/api/v1/archetypes/"},
								{key: "matchupData", params, url: "head_to_head_archetype_matchups"},
								{key: "popularityData", params, url: "archetype_popularity_distribution_stats"},
							]}
						>
							<ArchetypeMatchups
								cardData={this.props.cardData}
								gameType={this.props.gameType}
								mobileView={this.state.mobileView}
								setSortBy={this.props.setSortBy}
								setSortDirection={this.props.setSortDirection}
								sortBy={this.props.sortBy}
								sortDirection={this.props.sortDirection}
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
								gameType={this.props.gameType}
								sortDirection={this.props.sortDirection}
								setSortDirection={this.props.setSortDirection}
								sortBy={this.props.popularitySortBy}
								setSortBy={this.props.setPopularitySortBy}
							/>
						</DataInjector>
					</Tab>
				</TabList>
			);
		}

		return <div className="meta-overview-container">
			<aside className="infobox">
				<h1>Meta Overview</h1>
				<section id="time-frame-filter">
					<PremiumWrapper>
						<h2>Time Frame</h2>
						<InfoboxFilterGroup
							locked={!UserData.isPremium()}
							selectedValue={this.props.timeFrame}
							onClick={(value) => this.props.setTimeFrame(value)}
						>
							<InfoboxFilter value="LAST_1_DAY">Last 1 day</InfoboxFilter>
							<InfoboxFilter value="LAST_3_DAYS">Last 3 days</InfoboxFilter>
							<InfoboxFilter value="LAST_7_DAYS">Last 7 days</InfoboxFilter>
						</InfoboxFilterGroup>
					</PremiumWrapper>
				</section>
				<section id="rank-range-filter">
					<PremiumWrapper>
						<InfoboxFilterGroup
							header="Rank Range"
							locked={!UserData.isPremium()}
							selectedValue={this.props.rankRange}
							onClick={(value) => this.props.setRankRange(value)}
							disabled={["archetypes", "matchups"].indexOf(this.props.tab) === -1}
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
						<InfoboxLastUpdated {...this.getLastUpdated()} />
					</ul>
				</section>
			</aside>
			<main>
				{content}
			</main>
		</div>;
	}

	getLastUpdated(): any {
		const obj = {params: null, url: null};
		switch (this.props.tab) {
			case "archetypes":
			case "matchups":
				obj.url = "archetype_popularity_distribution_stats";
				obj.params = this.getParams();
				break;
			case "popularity":
			default:
				obj.url = "archetype_popularity_by_rank";
				obj.params = this.getPopularityParams();
				break;
		}
		return obj;
	}

	componentWillMount() {
		window.addEventListener("resize", this.onResize);
	}

	componentWillUnmount() {
		window.removeEventListener("resize", this.onResize);
	}

	onResize = () => {
		const width = window.innerWidth;
		if (this.state.mobileView && width > mobileWidth) {
			this.setState({mobileView: false});
		}
		else if (!this.state.mobileView && width <= mobileWidth) {
			this.setState({mobileView: true});
		}
	}
}
