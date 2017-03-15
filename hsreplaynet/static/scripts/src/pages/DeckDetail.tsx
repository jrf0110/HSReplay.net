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
import {
	getDustCost, getHeroCardId, toTitleCase, wildSets,
} from "../helpers";
import { TableData } from "../interfaces";

interface TableDataCache {
	[key: string]: TableData;
}

interface DeckDetailState {
	expandWinrate?: boolean;
	hasPeronalData?: boolean;
	personalSortBy?: string;
	personalSortDirection?: SortDirection;
	rankRange?: string;
	selectedClasses?: FilterOption[];
	showInfo?: boolean;
	sortBy?: string;
	sortDirection?: SortDirection;
}

interface DeckDetailProps extends React.ClassAttributes<DeckDetail> {
	cardData: CardData;
	deckCards: string;
	deckClass: string;
	deckId: number;
	deckName?: string;
	userIsAuthenticated: boolean;
	userIsPremium: boolean;
}

export default class DeckDetail extends React.Component<DeckDetailProps, DeckDetailState> {
	private readonly dataManager: DataManager = new DataManager();

	constructor(props: DeckDetailProps, state: DeckDetailState) {
		super(props, state);
		this.state = {
			expandWinrate: false,
			hasPeronalData: undefined,
			personalSortBy: "card",
			rankRange: "ALL",
			selectedClasses: ["ALL"],
			showInfo: false,
			sortBy: "decklist",
			sortDirection: "ascending",
		};

		if (this.props.userIsAuthenticated) {
			this.dataManager.get("/decks/mine/", {}).then((data) => {
				this.setState({hasPeronalData: data && data[this.props.deckId] !== undefined});
			});
		}
	}

	render(): JSX.Element {
		let dustCost = 0;
		if (this.props.cardData) {
			this.props.deckCards.split(",").forEach((id) => {
				const card = this.props.cardData.fromDbf(id);
				dustCost += getDustCost(card);
			});
		}

		const premiumMulligan = this.state.selectedClasses[0] !== "ALL" && this.props.userIsAuthenticated;

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
					class={this.props.deckClass}
					disabled={!this.props.cardData}
					name={this.props.deckName || toTitleCase(this.props.deckClass) + " Deck"}
					sourceUrl={window.location.toString()}
				/>
				<h2>Info</h2>
				<ul>
					<li>
						Class
						<span className="infobox-value">{toTitleCase(this.props.deckClass)}</span>
					</li>
					<li>
						Cost
						<span className="infobox-value">{dustCost && dustCost + " Dust"}</span>
					</li>
				</ul>
				<PremiumWrapper isPremium={this.props.userIsPremium}>
					<h2>Select your opponent</h2>
					<ClassFilter
						filters="All"
						hideAll
						minimal
						multiSelect={false}
						selectedClasses={this.state.selectedClasses}
						selectionChanged={(selected) => this.props.userIsPremium && this.setState({selectedClasses: selected})}
					/>
				</PremiumWrapper>
				<PremiumWrapper
					isPremium={this.props.userIsPremium}
					infoHeader="Deck breakdown rank range"
					infoContent="Check out how this deck performs at higher ranks!"
				>
					<h2>Rank range</h2>
					<InfoboxFilterGroup
						locked={!this.props.userIsPremium}
						selectedValue={this.state.rankRange}
						onClick={(value) => this.setState({rankRange: value})}
					>
						<InfoboxFilter value="LEGEND_THROUGH_TEN">Legend–10</InfoboxFilter>
						<InfoboxFilter value="ALL">Legend–25</InfoboxFilter>
					</InfoboxFilterGroup>
				</PremiumWrapper>
				<DataInjector
					dataManager={this.dataManager}
					fetchCondition={this.isWildDeck() !== undefined}
					query={{url: "list_decks_by_win_rate", params: {GameType: this.gameType()}}}
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
					fetchCondition={this.isWildDeck() !== undefined}
					query={{url: "/decks/mine/", params: {}}}
				>
					<HideLoading>
						<PersonalDeckStats deckId={this.props.deckId}/>
					</HideLoading>
				</DataInjector>
			</aside>
			<main>
				<section id="content-header">
					<div className="col-lg-6 col-md-6">
						<div className="chart-wrapper wide">
							<DataInjector
								dataManager={this.dataManager}
								fetchCondition={this.isWildDeck() !== undefined}
								query={{url: "single_deck_stats_over_time", params: this.getParams()}}
							>
								<ChartLoading>
									<PopularityLineChart
										widthRatio={2}
										maxYDomain={10}
									/>
								</ChartLoading>
							</DataInjector>
						</div>
					</div>
					<div className="col-lg-6 col-md-6">
						<div className="chart-wrapper wide">
							<DataInjector
								dataManager={this.dataManager}
								fetchCondition={this.isWildDeck() !== undefined}
								query={{url: "single_deck_stats_over_time", params: this.getParams()}}
							>
								<ChartLoading>
									<WinrateLineChart widthRatio={2} />
								</ChartLoading>
							</DataInjector>
						</div>
					</div>
				</section>
				<section id="page-content">
					<ul className="nav nav-tabs content-tabs">
						<li className="active"><a data-toggle="tab" href="#deck-breakdown">Deck breakdown</a></li>
						<li><a data-toggle="tab" href="#similar-decks">Similar decks</a></li>
						<li><a data-toggle="tab" href="#my-stats">My stats</a></li>
					</ul>
					<div className="tab-content">
						<div id="deck-breakdown" className="tab-pane fade in active">
							<div className="table-wrapper">
								<DataInjector
									dataManager={this.dataManager}
									fetchCondition={this.isWildDeck() !== undefined}
									query={[
										{
											key: "mulliganData",
											params: this.getParams(true),
											url: premiumMulligan ? "single_deck_mulligan_guide_by_class" : "single_deck_mulligan_guide",
										},
										{
											key: premiumMulligan ? "opponentWinrateData" : "winrateData",
											params: {GameType: this.gameType(), deck_id: premiumMulligan ? this.props.deckId : null},
											url: premiumMulligan ? "single_deck_base_winrate_by_opponent_class" : "list_decks_by_win_rate",
										},
									]}
								>
									<TableLoading
										cardData={this.props.cardData}
										dataKeys={["mulliganData", premiumMulligan ? "opponentWinrateData" : "winrateData"]}
									>
										<DeckBreakdownTable
											dataKey={this.state.selectedClasses[0]}
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
						</div>
						<div id="similar-decks" className="tab-pane fade">
							<DataInjector
								dataManager={this.dataManager}
								fetchCondition={this.isWildDeck() !== undefined}
								query={{url: "list_decks_by_win_rate", params: {GameType: this.gameType()}}}
							>
								<TableLoading cardData={this.props.cardData}>
									<SimilarDecksList
										playerClass={this.props.deckClass}
										rawCardList={this.props.deckCards}
										wildDeck={this.isWildDeck()}
									/>
								</TableLoading>
							</DataInjector>
						</div>
						<div id="my-stats" className="tab-pane fade">
							{this.getMyStats()}
						</div>
					</div>
				</section>
			</main>
		</div>;
	}

	getMyStats(): JSX.Element {
		if (!this.props.userIsAuthenticated) {
			return (
				<div className="account-login login-bnet">
					<p>You play this deck? Want to see card statistics based on your games?</p>
					<p className="login-button">
						<a className="btn promo-button hero-button" href={`/account/battlenet/login/?next=/decks/${this.props.deckId}/`}>
							Log in with battle.net
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
			.some((card) => wildSets.indexOf(card.set) !== -1);
	}

	gameType(): string {
		return this.isWildDeck() ? "RANKED_WILD" : "RANKED_STANDARD";
	}

	getParams(rankRange?: boolean): any {
		return {
			GameType: this.gameType(),
			RankRange: rankRange && this.state.rankRange || "ALL",
			deck_id: this.props.deckId,
		};
	}
}
