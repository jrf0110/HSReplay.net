import DataManager from "../DataManager";
import PremiumWrapper from "../components/PremiumWrapper";
import WinrateLineChart from "../components/charts/WinrateLineChart";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import DataInjector from "../components/DataInjector";
import DeckStats from "../components/deckdetail/DeckStats";
import SimilarDecksList from "../components/deckdetail/SimilarDecksList";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import ChartLoading from "../components/loading/ChartLoading";
import HideLoading from "../components/loading/HideLoading";
import CardData from "../CardData";
import * as React from "react";
import TableLoading from "../components/loading/TableLoading";
import PopularityLineChart from "../components/charts/PopularityLineChart";
import {getArchetypeUrl, getDustCost, getHeroCardId, isWildSet, toTitleCase} from "../helpers";
import {ApiArchetype, CardObj, RenderData, SortDirection, TableData} from "../interfaces";
import UserData from "../UserData";
import InfoIcon from "../components/InfoIcon";
import ManaCurve from "../components/ManaCurve";
import TabList from "../components/layout/TabList";
import Tab from "../components/layout/Tab";
import Tooltip from "../components/Tooltip";
import DeckOverviewTable from "../components/deckdetail/DeckOverviewTable";
import CopyDeckButton from "../components/CopyDeckButton";
import CardList from "../components/CardList";
import CardDetailPieChart from "../components/charts/CardDetailPieChart";
import ArchetypeSelector from "../components/ArchetypeSelector";
import DeckCountersList from "../components/deckdetail/DeckCountersList";
import DeckMatchups from "../components/deckdetail/DeckMatchups";
import ArchetypeTrainingSettings from "../components/ArchetypeTrainingSettings";
import CardTableContainer from "../components/cardtable/CardTableContainer";

interface TableDataCache {
	[key: string]: TableData;
}

interface AvailableFilters {
	[key: string]: string[];
}

interface DeckDetailState {
	account?: string;
	availableFilters?: AvailableFilters;
	expandWinrate?: boolean;
	hasData?: boolean;
	hasPeronalData?: boolean;
	personalSortBy?: string;
	personalSortDirection?: SortDirection;
	showInfo?: boolean;
	sortBy?: string;
	sortDirection?: SortDirection;
}

interface DeckDetailProps {
	adminUrl: string;
	archetypeId?: string;
	archetypeName?: string;
	cardData: CardData;
	deckCards: string;
	deckClass: string;
	deckId: string;
	deckName?: string;
	heroDbfId: number;
	tab?: string;
	setTab?: (tab: string) => void;
	selectedClasses?: FilterOption[];
	setSelectedClasses?: (selectedClasses: FilterOption[]) => void;
	rankRange?: string;
	setRankRange?: (rankRange: string) => void;
	gameType?: string;
	setGameType?: (gameType: string) => void;
}

export default class DeckDetail extends React.Component<DeckDetailProps, DeckDetailState> {
	constructor(props: DeckDetailProps, state: DeckDetailState) {
		super(props, state);
		this.state = {
			account: UserData.getDefaultAccountKey(),
			availableFilters: {},
			expandWinrate: false,
			hasData: undefined,
			hasPeronalData: undefined,
			personalSortBy: "card",
			personalSortDirection: "ascending",
			showInfo: false,
			sortBy: "decklist",
			sortDirection: "ascending",
		};
		this.fetchPersonalDeckSummary();
	}

	componentWillUpdate(nextProps: DeckDetailProps, nextState: DeckDetailState) {
		if (nextState.account !== this.state.account) {
			this.fetchPersonalDeckSummary(nextState);
		}
	}

	fetchPersonalDeckSummary(state?: DeckDetailState) {
		if (UserData.hasFeature("personal-deck-stats")) {
			DataManager.get("single_account_lo_decks_summary", this.getPersonalParams(state)).then((data) => {
				this.setState({
					hasPeronalData: data && data.series.data[this.props.deckClass].some((deck) => deck.deck_id === this.props.deckId),
				});
			});
		}
	}

	componentDidUpdate(prevProps: DeckDetailProps, prevState: DeckDetailState) {
		if (!prevProps.cardData && this.props.cardData) {
			DataManager.get("list_deck_inventory").then((data) => {
				if (data) {
					const availableFilters = data.series[this.props.deckId];
					const gameTypes = availableFilters && Object.keys(availableFilters);
					if (gameTypes && gameTypes.indexOf(this.props.gameType) === -1) {
						const gameType = gameTypes.indexOf("RANKED_STANDARD") !== -1 ? "RANKED_STANDARD" : "RANKED_WILD";
						this.props.setGameType(gameType);
					}
					this.setState({availableFilters, hasData: !!availableFilters});
				}
			});
		}
	}

	render(): JSX.Element {
		const dbfIds = this.props.deckCards.split(",").map(Number);
		const cards = [];
		let dustCost = null;
		let deckCharts = null;
		if (this.props.cardData) {
			dustCost = 0;
			dbfIds.forEach((id) => {
				const card = this.props.cardData.fromDbf(id);
				const cardObj = cards.find((obj) => obj.card.id === card.id) || cards[cards.push({card, count: 0}) - 1];
				cardObj.count++;
				dustCost += getDustCost(card);
			});

			deckCharts = this.getChartData(cards).map((data) => (
				<div className="chart-wrapper">
					<CardDetailPieChart data={data} customViewbox="0 30 400 310" removeEmpty/>
				</div>
			));
		}

		let archetypeInfo = null;
		if (this.props.archetypeName && UserData.hasFeature("archetype-detail")) {
			archetypeInfo = (
				<li>
					Archetype
					<a className="infobox-value" href={getArchetypeUrl(this.props.archetypeId, this.props.archetypeName)}>
						{this.props.archetypeName}
					</a>
				</li>
			);
		}

		const isPremium = UserData.isPremium();
		const premiumTabIndex = isPremium ? 0 : -1;

		let accountFilter = null;
		if (isPremium && UserData.getAccounts().length > 0 && UserData.hasFeature("personal-deck-stats")) {
			const accounts = [];
			UserData.getAccounts().forEach((acc) => {
				accounts.push(
					<InfoboxFilter value={acc.region + "-" + acc.lo}>
						{acc.display}
					</InfoboxFilter>,
				);
			});
			if (accounts.length) {
				accountFilter = (
					<InfoboxFilterGroup
						header="Accounts"
						selectedValue={this.state.account}
						onClick={(account) => {
							UserData.setDefaultAccount(account);
							this.setState({account});
						}}
						tabIndex={accounts.length > 1 ? 0 : -1}
					>
						{accounts}
					</InfoboxFilterGroup>
				);
			}
		}

		const infoBoxFilter = (key: string, text: string) => {
			let content: any = text;
			const hasFilter = this.hasRankRange(key);
			if (this.state.hasData && !hasFilter) {
				content = (
					<Tooltip
						header="Not enough data"
						content={`This deck does not have enough data at ${text}.`}
					>
						{text}
					</Tooltip>
				);
			}
			return (
				<InfoboxFilter value={key} disabled={!hasFilter}>
					{content}
				</InfoboxFilter>
			);
		};

		const overviewContent = [];

		const cardList = (
			<div className="card-list-wrapper">
				<CardList
					cardData={this.props.cardData}
					cardList={dbfIds}
					name={this.props.deckName || toTitleCase(this.props.deckClass) + " Deck"}
					heroes={[this.props.heroDbfId]}
				/>
			</div>
		);

		let filters = null;
		let header = null;
		if (this.state.hasData === false) {
			header = (
				<h4 className="message-wrapper" id="message-no-data">This deck does not have enough data.</h4>
			);

			overviewContent.push(
				<div className="col-lg-6 col-md-6 col-sm-12 col-xs-12">
					{cardList}
					<ManaCurve cards={cards}/>
				</div>,
				<div className="col-lg-6 col-md-6 col-sm-12 col-xs-12">
					{deckCharts && deckCharts[0]}
					{deckCharts && deckCharts[1]}
				</div>,
			);
		}
		else {
			filters = [
				<PremiumWrapper name="Single Deck Opponent Selection">
					<h2>Select your opponent</h2>
					<ClassFilter
						filters="All"
						hideAll
						minimal
						tabIndex={premiumTabIndex}
						selectedClasses={this.props.selectedClasses}
						selectionChanged={(selectedClasses) => this.props.setSelectedClasses(selectedClasses)}
					/>
				</PremiumWrapper>,
				<PremiumWrapper
					name="Single Deck Rank Range"
					infoHeader="Deck breakdown rank range"
					infoContent={[
						<p>Check out how this deck performs at higher ranks!</p>,
						<br/>,
						<p>Greyed out filters indicate an insufficient amount of data for that rank range.</p>,
					]}
				>
					<h2>Rank range</h2>
					<InfoboxFilterGroup
						locked={!isPremium}
						selectedValue={this.rankRange()}
						onClick={(rankRange) => this.props.setRankRange(rankRange)}
						tabIndex={premiumTabIndex}
					>
						{infoBoxFilter("LEGEND_ONLY", "Legend only")}
						{infoBoxFilter("LEGEND_THROUGH_FIVE", "Legend–5")}
						{infoBoxFilter("LEGEND_THROUGH_TEN", "Legend–10")}
						{infoBoxFilter("ALL", "Legend–25")}
					</InfoboxFilterGroup>
				</PremiumWrapper>,
			];

			header = [
				<div className="col-lg-6 col-md-6">
					<div className="chart-wrapper wide">
						<DataInjector
							fetchCondition={!!this.state.hasData && this.isWildDeck() !== undefined}
							query={{url: "single_deck_stats_over_time", params: this.getParams()}}
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
				</div>,
				<div className="col-lg-6 col-md-6">
					<div className="chart-wrapper wide">
						<DataInjector
							fetchCondition={!!this.state.hasData && this.isWildDeck() !== undefined}
							query={{url: "single_deck_stats_over_time", params: this.getParams()}}
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
			];

			overviewContent.push(
				<div className="col-lg-3 col-md-6 col-sm-12 col-xs-12">
					{cardList}
				</div>,
				<div className="col-lg-5 col-md-6 col-sm-12 col-xs-12">
					<ManaCurve cards={cards}/>
					<DataInjector
						fetchCondition={!!this.state.hasData && this.isWildDeck !== undefined}
						query={[
							{
								key: "opponentWinrateData",
								params: this.getParams(),
								url: "single_deck_base_winrate_by_opponent_class",
							},
							{
								key: "deckListData",
								params: {GameType: this.gameType(), RankRange: this.rankRange()},
								url: "list_decks_by_win_rate",
							},
						]}
					>
						<TableLoading
							dataKeys={["opponentWinrateData", "deckListData"]}
						>
							<DeckOverviewTable
								deckId={this.props.deckId}
								playerClass={this.props.deckClass}
							/>
						</TableLoading>
					</DataInjector>
				</div>,
				<div className="col-lg-4 col-md-12 col-sm-12 col-xs-12">
					{deckCharts && deckCharts[0]}
					{deckCharts && deckCharts[1]}
				</div>,
			);
		}

		return <div className="deck-detail-container">
			<aside className="infobox">
				<img
					className="hero-image"
					src={"https://art.hearthstonejson.com/v1/256x/" + getHeroCardId(this.props.deckClass, true) + ".jpg"}
				/>
				<div className="text-center copy-deck-wrapper">
					<CopyDeckButton
						cardData={this.props.cardData}
						cards={dbfIds}
						heroes={[this.props.heroDbfId]}
						format={this.gameType() === "RANKED_STANDARD" ? 2 : 1}
						deckClass={this.props.deckClass}
						name={this.props.deckName || toTitleCase(this.props.deckClass) + " Deck"}
						sourceUrl={window.location.toString()}
					/>
				</div>
				<h2>Deck</h2>
				<ul>
					<li>
						Class
						<a
							className="infobox-value"
							href={"/decks/#playerClasses=" + this.props.deckClass}
						>
							{toTitleCase(this.props.deckClass)}
						</a>
					</li>
					{archetypeInfo}
					<li>
						Cost
						<span className="infobox-value">{dustCost ? dustCost + " Dust" : "Counting…"}</span>
					</li>
				</ul>
				{filters}
				{accountFilter}
				<DataInjector
					fetchCondition={!!this.state.hasData && this.isWildDeck() !== undefined}
					query={{url: "list_decks_by_win_rate", params: {GameType: this.gameType(), RankRange: this.rankRange()}}}
				>
					<HideLoading>
						<DeckStats
							playerClass={this.props.deckClass}
							deckId={this.props.deckId}
							lastUpdatedUrl="single_deck_stats_over_time"
							lastUpdatedParams={this.getParams()}
						/>
					</HideLoading>
				</DataInjector>
				{this.renderAdminSettings()}
			</aside>
			<main>
				<section id="content-header">
					{header}
				</section>
				<section id="page-content">
					<TabList tab={this.props.tab} setTab={this.props.setTab}>
						<Tab label="Overview" id="overview">
							{overviewContent}
						</Tab>
						<Tab label="Breakdown" id="breakdown" hidden={this.state.hasData === false}>
							{this.renderMulliganGuideTable()}
						</Tab>
						<Tab label="Similar Decks" id="similar">
							<DataInjector
								fetchCondition={this.isWildDeck() !== undefined}
								query={{url: "list_decks_by_win_rate", params: {GameType: this.gameType(), RankRange: this.rankRange()}}}
							>
								<TableLoading cardData={this.props.cardData}>
									<SimilarDecksList
										playerClass={this.props.deckClass}
										rawCardList={this.props.deckCards}
										wildDeck={this.isWildDeck()}
									/>
								</TableLoading>
							</DataInjector>
						</Tab>
						<Tab
							label={(
								<span className="text-premium">
									My Statistics&nbsp;
									<InfoIcon
										header="Personal statistics"
										content="See detailed statistics about your own performance of each card in this deck."
									/>
								</span>
							)}
							id="my-statistics"
							hidden={!UserData.hasFeature("personal-deck-stats")}
						>
							{this.getMyStats()}
						</Tab>
						<Tab
							label="Matchups"
							id="matchups"
							hidden={!UserData.hasFeature("deck-matchups")}
						>
							<DataInjector
								fetchCondition={this.isWildDeck() !== undefined}
								query={[
									{
										key: "archetypeMatchupData",
										params: {GameType: this.gameType(), RankRange: this.rankRange(), deck_id: this.props.deckId},
										url: "single_deck_archetype_matchups",
									},
									{
										key: "classMatchupData",
										params: {GameType: this.gameType(), RankRange: this.rankRange(), deck_id: this.props.deckId},
										url: "single_deck_base_winrate_by_opponent_class",
									},
									{
										key: "archetypeData",
										params: {},
										url: "/api/v1/archetypes/",
									},
								]}
							>
								<TableLoading dataKeys={["archetypeMatchupData", "classMatchupData", "archetypeData"]}>
									<DeckMatchups/>
								</TableLoading>
							</DataInjector>
						</Tab>
						<Tab
							label={(
								<span className="text-premium">
									Deck Counters&nbsp;
									<InfoIcon
										header="Deck Counters"
										content="A list of archetypes and decks that this deck has trouble against."
									/>
								</span>
							)}
							id="deck-counters"
							hidden={!UserData.hasFeature("deck-counters")}
						>
							<DataInjector
								fetchCondition={this.isWildDeck() !== undefined}
								query={[
									{
										key: "deckData",
										params: {GameType: this.gameType(), RankRange: this.rankRange()},
										url: "list_decks_by_win_rate",
									},
									{
										key: "countersData",
										params: {GameType: this.gameType(), RankRange: this.rankRange(), deck_id: this.props.deckId},
										url: "single_deck_recommended_counters",
									},
								]}
							>
								<TableLoading
									cardData={this.props.cardData}
									dataKeys={["deckData", "countersData"]}
								>
									<DeckCountersList/>
								</TableLoading>
							</DataInjector>
						</Tab>
					</TabList>
				</section>
			</main>
		</div>;
	}

	renderMulliganGuideTable(): JSX.Element {
		const premiumMulligan = (
			UserData.isPremium() &&
			this.props.selectedClasses.length &&
			this.props.selectedClasses[0] !== "ALL"
		);

		const dataKey = this.props.selectedClasses.length ? this.props.selectedClasses[0] : "ALL";

		return (
			<DataInjector
				fetchCondition={!!this.state.hasData && this.isWildDeck() !== undefined}
				query={[
					{
						key: "mulliganData",
						params: this.getParams(),
						url: premiumMulligan ? "single_deck_mulligan_guide_by_class" : "single_deck_mulligan_guide",
					},
					{
						key: "winrateData",
						params: (premiumMulligan ? this.getParams() : {GameType: this.gameType(), RankRange: this.rankRange()}),
						url: premiumMulligan ? "single_deck_base_winrate_by_opponent_class" : "list_decks_by_win_rate",
					},
				]}
				extract={{
					mulliganData: (data) => ({data: data.series.data[dataKey]}),
					winrateData: (data) => {
						let baseWinrate = 50;
						if (premiumMulligan) {
							baseWinrate = +data.series.data[dataKey][0].winrate;
						}
						else {
							const deck = data.series.data[this.props.deckClass].find((x) => x.deck_id === this.props.deckId);
							if (deck) {
								baseWinrate = +deck.win_rate;
							}
						}
						return {baseWinrate};
					},
				}}
			>
				<CardTableContainer
					cards={this.getCards()}
					columns={[
						"mulliganWinrate",
						"keepPercent",
						"drawnWinrate",
						"playedWinrate",
						"turnsInHand",
						"turnPlayed",
					]}
					onSortChanged={(sortBy: string, sortDirection: SortDirection) => {
						this.setState({personalSortBy: sortBy, personalSortDirection: sortDirection});
					}}
					sortBy={this.state.personalSortBy}
					sortDirection={this.state.personalSortDirection as SortDirection}
				/>
			</DataInjector>
		);
	}

	getMyStats(): JSX.Element {
		if (!UserData.isAuthenticated()) {
			return (
				<div className="account-login login-bnet">
					<p>You play this deck? Want to see card statistics based on your games?</p>
					<p className="login-button">
						<a className="btn promo-button hero-button" href={`/account/battlenet/login/?next=/decks/${this.props.deckId}/`}>
							Log in with Blizzard
						</a>
					</p>
					<p className="help-block"><i>We are only able to include games recorded by Hearthstone Deck Tracker.</i></p>
				</div>
			);
		}

		const params = {deck_id: this.props.deckId, ...this.getPersonalParams()};
		return (
			<DataInjector
				fetchCondition={this.isWildDeck() !== undefined && this.state.hasPeronalData === true}
				query={{params, url: "single_account_lo_individual_card_stats_for_deck"}}
				extract={{
					data: (data) => ({data: data.series.data["ALL"]}),
				}}
			>
				<CardTableContainer
					cards={this.getCards()}
					columns={[
						"mulliganWinrate",
						"keepPercent",
						"drawnWinrate",
						"playedWinrate",
						"turnsInHand",
						"turnPlayed",
						"timesPlayed",
						"damageDone",
						"healingDone",
						"heroesKilled",
						"minionsKilled",
					]}
					onSortChanged={(sortBy: string, sortDirection: SortDirection) => {
						this.setState({personalSortBy: sortBy, personalSortDirection: sortDirection});
					}}
					sortBy={this.state.personalSortBy}
					sortDirection={this.state.personalSortDirection as SortDirection}
				/>
			</DataInjector>
		);
	}

	getCards(): CardObj[] {
		const cards: CardObj[] = [];
		if (this.props.cardData) {
			const dbfIds = {};
			this.props.deckCards.split(",").map((id) => {
				dbfIds[id] = (dbfIds[id] || 0) + 1;
			});
			Object.keys(dbfIds).forEach((dbfId) => {
				cards.push({
					card: this.props.cardData.fromDbf(dbfId),
					count: dbfIds[dbfId],
				});
			});
		}
		return cards;
	}

	isWildDeck(): boolean {
		if (!this.props.deckCards || !this.props.cardData) {
			return undefined;
		}
		return this.props.deckCards.split(",").map((dbfId) => this.props.cardData.fromDbf(dbfId))
			.some((card) => isWildSet(card.set));
	}

	hasGameType(gameType: string): boolean {
		return this.state.hasData && Object.keys(this.state.availableFilters).indexOf(gameType) !== -1;
	}

	gameType(): string {
		return this.hasGameType(this.props.gameType) ? this.props.gameType : "RANKED_STANDARD";
	}

	hasRankRange(rankRange: string): boolean {
		const gameType = this.gameType();
		if (!this.state.hasData) {
			return false;
		}
		if (!this.state.availableFilters[gameType] || !Array.isArray(this.state.availableFilters[gameType])) {
			return false;
		}
		return this.state.availableFilters[gameType].indexOf(rankRange) !== -1;
	}

	rankRange(): string {
		return this.hasRankRange(this.props.rankRange) ? this.props.rankRange : "ALL";
	}

	getParams(): any {
		return {
			GameType: this.gameType(),
			RankRange: this.rankRange(),
			deck_id: this.props.deckId,
		};
	}

	getPersonalParams(state?: DeckDetailState): any {
		state = state || this.state;
		const getRegion = (account: string) => account && account.split("-")[0];
		const getLo = (account: string) => account && account.split("-")[1];
		return {
			GameType: this.gameType(),
			Region: getRegion(state.account),
			account_lo: getLo(state.account),
		};
	}

	getChartData(cards: CardObj[]): RenderData[] {
		const dataSets = [{}, {}];

		cards.forEach((cardObj) => {
			dataSets[0][cardObj.card.rarity] = (dataSets[0][cardObj.card.rarity] || 0) + cardObj.count;
			dataSets[1][cardObj.card.type] = (dataSets[1][cardObj.card.type] || 0) + cardObj.count;
		});

		const renderData = [
			{ series: [ { name: "rarity", data: [], metadata: {chart_scheme: "rarity"} } ]},
			{ series: [ { name: "type", data: [], metadata: {chart_scheme: "cardtype"} } ] },
		];

		dataSets.forEach((set, index) => {
			Object.keys(set).forEach((key) => {
				renderData[index].series[0].data.push({x: key, y: set[key]});
			});
		});

		return renderData;
	}

	renderAdminSettings(): JSX.Element {
		const items = [];
		if (UserData.isStaff() && this.props.adminUrl) {
			items.push(
				<li>
					<span>View in Admin</span>
					<span className="infobox-value">
						<a href={this.props.adminUrl}>Admin link</a>
					</span>
				</li>,
			);
		}
		if (UserData.hasFeature("archetype-selection")) {
			items.push(
				<li>
					<span>Archetype</span>
					<span className="infobox-value">
						<DataInjector
							query={[
								{key: "archetypeData", url: "/api/v1/archetypes/", params: {}},
								{key: "deckData", url: "/api/v1/decks/" + this.props.deckId, params: {}},
							]}
							extract={{
								archetypeData: (data: ApiArchetype[]) => {
									const archetypes = data.filter((a) => a.player_class_name === this.props.deckClass);
									return {archetypes};
								},
								deckData: (data) => ({defaultSelectedArchetype: data.archetype}),
							}}
						>
							<HideLoading>
								<ArchetypeSelector deckId={this.props.deckId} />
							</HideLoading>
						</DataInjector>
					</span>
				</li>,
			);
		}
		if (UserData.hasFeature("archetype-training")) {
			items.push(
			<li>
				<DataInjector
					query={{key: "trainingData", url: "/api/v1/archetype-training/", params: {}}}
					extract={{
						trainingData: (trainingData) => {
							const data = trainingData.find((d) => d.deck.shortid === this.props.deckId);
							if (data) {
								return {
									trainingData: {
										deck: data.deck.id,
										id: data.id,
										is_validation_deck: data.is_validation_deck,
									},
								};
							}
						},
					}}
				>
					<HideLoading>
						<ArchetypeTrainingSettings
							deckId={this.props.deckId}
							playerClass={this.props.deckClass}
						/>
					</HideLoading>
				</DataInjector>
			</li>,
			);
		}

		if (items.length === 0) {
			return null;
		}

		return (
			<div>
				<h2>Admin</h2>
				<ul>
					{items}
				</ul>
			</div>
		);
	}
}
