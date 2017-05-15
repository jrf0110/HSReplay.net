import * as React from "react";
import CardData from "../CardData";
import PopularityLineChart from "../components/charts/PopularityLineChart";
import WinrateLineChart from "../components/charts/WinrateLineChart";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import DataInjector from "../components/DataInjector";
import DeckBreakdownTable from "../components/deckdetail/DeckBreakdownTable";
import DeckStats from "../components/deckdetail/DeckStats";
import MyCardStatsTable from "../components/deckdetail/MyCardStatsTable";
import PersonalDeckStats from "../components/deckdetail/PersonalDeckStats";
import SimilarDecksList from "../components/deckdetail/SimilarDecksList";
import HDTButton from "../components/HDTButton";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import ChartLoading from "../components/loading/ChartLoading";
import HideLoading from "../components/loading/HideLoading";
import TableLoading from "../components/loading/TableLoading";
import PremiumWrapper from "../components/PremiumWrapper";
import {SortDirection} from "../components/SortableTable";
import DataManager from "../DataManager";
import {getDustCost, getHeroCardId, isWildSet, toTitleCase} from "../helpers";
import { TableData } from "../interfaces";
import UserData from "../UserData";
import InfoIcon from "../components/InfoIcon";
import ManaCurve from "../components/ManaCurve";
import TabList from "../components/layout/TabList";
import Tab from "../components/layout/Tab";
import Tooltip from "../components/Tooltip";
import WinrateBreakdownTable from "../components/deckdetail/WinrateBreakdownTable";
import DeckOverviewTable from "../components/deckdetail/DeckOverviewTable";

interface TableDataCache {
	[key: string]: TableData;
}

interface AvailableFilters {
	[key: string]: string[];
}

interface DeckDetailState {
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
	account?: string;
	setAccount?: (account: string) => void;
	adminUrl: string;
	cardData: CardData;
	deckCards: string;
	deckClass: string;
	deckId: string;
	deckName?: string;
	user: UserData;
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
	private readonly dataManager: DataManager = new DataManager();

	constructor(props: DeckDetailProps, state: DeckDetailState) {
		super(props, state);
		this.state = {
			availableFilters: {},
			expandWinrate: false,
			hasData: undefined,
			hasPeronalData: undefined,
			personalSortBy: "card",
			showInfo: false,
			sortBy: "decklist",
			sortDirection: "ascending",
		};
		this.fetchPersonalDeckSummary();
	}

	componentWillReceiveProps(nextProps: DeckDetailProps, nextState: DeckDetailState) {
		if (nextProps.account !== this.props.account) {
			this.fetchPersonalDeckSummary(nextProps);
		}
	}

	fetchPersonalDeckSummary(props?: DeckDetailProps) {
		if (this.props.user.hasFeature("personal-deck-stats")) {
			this.dataManager.get("single_account_lo_decks_summary", this.getPersonalParams(props)).then((data) => {
				this.setState({
					hasPeronalData: data && data.series.data[this.props.deckClass].some((deck) => deck.deck_id === this.props.deckId),
				});
			});
		}
	}

	componentDidUpdate(prevProps: DeckDetailProps, prevState: DeckDetailState) {
		if (!prevProps.cardData && this.props.cardData) {
			this.dataManager.get("list_deck_inventory").then((data) => {
				if (data) {
					const availableFilters = data.series[this.props.deckId];
					const gameTypes = Object.keys(availableFilters);
					if (gameTypes.indexOf(this.props.gameType) === -1) {
						const gameType = gameTypes.indexOf("RANKED_STANDARD") !== -1 ? "RANKED_STANDARD" : "RANKED_WILD";
						this.props.setGameType(gameType);
					}
					this.setState({availableFilters, hasData: !!availableFilters});
				}
			});
		}
	}

	render(): JSX.Element {
		const cards = [];
		let dustCost = 0;
		if (this.props.cardData) {
			this.props.deckCards.split(",").forEach((id) => {
				const card = this.props.cardData.fromDbf(id);
				const cardObj = cards.find((obj) => obj.card.id === card.id) || cards[cards.push({card, count: 0}) - 1];
				cardObj.count++;
				dustCost += getDustCost(card);
			});
		}

		const isPremium = this.props.user.isPremium();
		const premiumTabIndex = isPremium ? 0 : -1;

		const premiumMulligan = (
			isPremium &&
			this.props.selectedClasses.length &&
			this.props.selectedClasses[0] !== "ALL"
		);

		let accountFilter = null;
		if (this.props.user.isPremium()
			&& this.props.user.getAccounts().length > 0
			&& this.props.user.hasFeature("personal-deck-stats")) {
			const accounts = [];
			this.props.user.getAccounts().forEach((acc) => {
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
						selectedValue={this.props.account}
						onClick={(value) => {
							this.props.user.setDefaultAccount(value);
							this.props.setAccount(value);
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

		const rankRanges = [
			infoBoxFilter("LEGEND_ONLY", "Legend only"),
			infoBoxFilter("LEGEND_THROUGH_FIVE", "Legend–5"),
			infoBoxFilter("LEGEND_THROUGH_TEN", "Legend–10"),
			infoBoxFilter("ALL", "Legend–25"),
		];

		return <div className="deck-detail-container">
			<aside className="infobox">
				<img
					className="hero-image"
					src={"https://art.hearthstonejson.com/v1/256x/" + getHeroCardId(this.props.deckClass, true) + ".jpg"}
				/>
				<HDTButton
					card_ids={
						this.props.cardData && this.props.deckCards.split(",").map((dbfId) => this.props.cardData.fromDbf(dbfId).id)
					}
					deckClass={this.props.deckClass}
					disabled={!this.props.cardData}
					name={this.props.deckName || toTitleCase(this.props.deckClass) + " Deck"}
					sourceUrl={window.location.toString()}
				/>
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
					<li>
						Cost
						<span className="infobox-value">{dustCost && dustCost + " Dust"}</span>
					</li>
				</ul>
				<PremiumWrapper name="Single Deck Opponent Selection" isPremium={isPremium}>
					<h2>Select your opponent</h2>
					<ClassFilter
						filters="All"
						hideAll
						minimal
						tabIndex={premiumTabIndex}
						selectedClasses={this.props.selectedClasses}
						selectionChanged={(selectedClasses) => this.props.setSelectedClasses(selectedClasses)}
					/>
				</PremiumWrapper>
				<PremiumWrapper
					name="Single Deck Rank Range"
					isPremium={isPremium}
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
					{rankRanges}
					</InfoboxFilterGroup>
				</PremiumWrapper>
				{accountFilter}
				<DataInjector
					dataManager={this.dataManager}
					fetchCondition={!!this.state.hasData && this.isWildDeck() !== undefined}
					query={{url: "list_decks_by_win_rate", params: {GameType: this.gameType(), RankRange: this.rankRange()}}}
				>
					<HideLoading>
						<DeckStats
							playerClass={this.props.deckClass}
							deckId={this.props.deckId}
							dataManager={this.dataManager}
							lastUpdatedUrl="single_deck_stats_over_time"
							lastUpdatedParams={this.getParams()}
						/>
					</HideLoading>
				</DataInjector>
				<DataInjector
					dataManager={this.dataManager}
					fetchCondition={this.props.user.hasFeature("profiles") && this.isWildDeck() !== undefined}
					query={{url: "/decks/mine/", params: {}}}
				>
					<HideLoading>
						<PersonalDeckStats deckId={this.props.deckId}/>
					</HideLoading>
				</DataInjector>
				{this.props.user.isStaff() && this.props.adminUrl && (
					<ul>
						<li>
							<span>View in Admin</span>
							<span className="infobox-value">
								<a href={this.props.adminUrl}>Admin link</a>
							</span>
						</li>
					</ul>
				)}
			</aside>
			<main>
				<section id="content-header">
					<div className="col-lg-6 col-md-6">
						<div className="chart-wrapper wide">
							<DataInjector
								dataManager={this.dataManager}
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
					</div>
					<div className="col-lg-6 col-md-6">
						<div className="chart-wrapper wide">
							<DataInjector
								dataManager={this.dataManager}
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
					</div>
				</section>
				<section id="page-content">
					<TabList tab={this.props.tab} setTab={this.props.setTab}>
						<Tab label="Overview" id="overview">
							<div className="col-lg-6 col-md-6 col-sm-12 col-xs-12">
								<ManaCurve cards={cards}/>
								<DataInjector
									dataManager={this.dataManager}
									fetchCondition={!!this.state.hasData && this.isWildDeck !== undefined}
									query={{
										params: {GameType: this.gameType(), RankRange: this.rankRange()},
										url: "list_decks_by_win_rate",
									}}
								>
									<TableLoading customMessage={this.state.hasData === false ? "No available data" : undefined}>
										<DeckOverviewTable
											deckId={this.props.deckId}
											playerClass={this.props.deckClass}
										/>
									</TableLoading>
								</DataInjector>
							</div>
							<div className="col-lg-6 col-md-6 col-sm-12 col-xs-12">
								<DataInjector
									dataManager={this.dataManager}
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
										customMessage={this.state.hasData === false ? "No available data" : undefined}
									>
										<WinrateBreakdownTable
											deckId={this.props.deckId}
											playerClass={this.props.deckClass}
										/>
									</TableLoading>
								</DataInjector>
							</div>
						</Tab>
						<Tab label="Breakdown" id="breakdown">
							<div className="table-wrapper">
								<DataInjector
									dataManager={this.dataManager}
									fetchCondition={!!this.state.hasData && this.isWildDeck() !== undefined}
									query={[
										{
											key: "mulliganData",
											params: this.getParams(),
											url: premiumMulligan ? "single_deck_mulligan_guide_by_class" : "single_deck_mulligan_guide",
										},
										{
											key: premiumMulligan ? "opponentWinrateData" : "winrateData",
											params: (premiumMulligan ? this.getParams() : {GameType: this.gameType(), RankRange: this.rankRange()}),
											url: premiumMulligan ? "single_deck_base_winrate_by_opponent_class" : "list_decks_by_win_rate",
										},
									]}
								>
									<TableLoading
										cardData={this.props.cardData}
										dataKeys={["mulliganData", premiumMulligan ? "opponentWinrateData" : "winrateData"]}
										customMessage={this.state.hasData === false ? "No available data" : undefined}
									>
										<DeckBreakdownTable
											dataKey={this.props.selectedClasses.length ? this.props.selectedClasses[0] : "ALL"}
											deckId={this.props.deckId}
											onSortChanged={(sortBy: string, sortDirection: SortDirection) => this.setState({sortBy, sortDirection})}
											playerClass={this.props.deckClass}
											rawCardsList={this.props.deckCards}
											sortBy={this.state.sortBy}
											sortDirection={this.state.sortDirection}
											wildDeck={this.isWildDeck()}
										/>
									</TableLoading>
								</DataInjector>
							</div>
						</Tab>
						<Tab label="Similar Decks" id="similar">
							<DataInjector
								dataManager={this.dataManager}
								fetchCondition={!!this.state.hasData && this.isWildDeck() !== undefined}
								query={{url: "list_decks_by_win_rate", params: {GameType: this.gameType(), RankRange: this.rankRange()}}}
							>
								<TableLoading
									cardData={this.props.cardData}
									customMessage={this.state.hasData === false ? "No available data" : undefined}
								>
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
							hidden={!this.props.user.hasFeature("personal-deck-stats")}
						>
							{this.getMyStats()}
						</Tab>
					</TabList>
				</section>
			</main>
		</div>;
	}

	getMyStats(): JSX.Element {
		if (!this.props.user.isAuthenticated()) {
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
		return (
			<div className="table-wrapper">
				<DataInjector
					dataManager={this.dataManager}
					fetchCondition={this.isWildDeck() !== undefined && this.state.hasPeronalData === true}
					query={{
						params: {deck_id: this.props.deckId, gameType: this.gameType()},
						url: "single_account_lo_individual_card_stats_for_deck",
					}}
				>
					<TableLoading
						cardData={this.props.cardData}
						customMessage={this.state.hasPeronalData === false ? "You have not played this deck recently." : null}
					>
						<MyCardStatsTable
							cards={
								this.props.cardData && this.props.deckCards.split(",").sort()
									.filter((item, pos, array) => !pos || item !== array[pos - 1])
									.map((dbfId) => this.props.cardData.fromDbf(dbfId))
							}
							hiddenColumns={["totalGames", "winrate", "distinctDecks"]}
							numCards={30}
							onSortChanged={(sortBy: string, sortDirection: SortDirection) => {
								this.setState({personalSortBy: sortBy, personalSortDirection: sortDirection});
							}}
							sortBy={this.state.personalSortBy}
							sortDirection={this.state.personalSortDirection as SortDirection}
						/>
					</TableLoading>
				</DataInjector>
			</div>
		);
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
	};

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

	getPersonalParams(props?: DeckDetailProps): any {
		props = props || this.props;
		const getRegion = (account: string) => account && account.split("-")[0];
		const getLo = (account: string) => account && account.split("-")[1];
		return {
			GameType: this.gameType(),
			Region: getRegion(props.account),
			account_lo: getLo(props.account),
		};
	}

}
