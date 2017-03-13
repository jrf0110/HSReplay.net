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
	userIsPremium: boolean;
}

export default class DeckDetail extends React.Component<DeckDetailProps, DeckDetailState> {
	private readonly dataManager: DataManager = new DataManager();

	constructor(props: DeckDetailProps, state: DeckDetailState) {
		super(props, state);
		this.state = {
			expandWinrate: false,
			personalSortBy: "card",
			rankRange: "ALL",
			selectedClasses: ["ALL"],
			showInfo: false,
			sortBy: "decklist",
			sortDirection: "ascending",
		};
	}

	render(): JSX.Element {
		let dustCost = 0;
		let hdtButton = null;
		if (this.props.cardData) {
			this.props.deckCards.split(",").forEach((id) => {
				const card = this.props.cardData.fromDbf(id);
				dustCost += getDustCost(card);
			});
			hdtButton = (
				<HDTButton
					card_ids={this.props.deckCards.split(",").map((dbfId) => this.props.cardData.fromDbf(dbfId).id)}
					class={this.props.deckClass}
					name={this.props.deckName || toTitleCase(this.props.deckClass) + " Deck"}
					sourceUrl={window.location.toString()}
				/>
			);
		}

		return <div className="deck-detail-container">
			<aside className="infobox">
				<img
					className="hero-image"
					src={"https://art.hearthstonejson.com/v1/256x/" + getHeroCardId(this.props.deckClass, true) + ".jpg"}
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
					{hdtButton}
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
					query={{url: "list_decks_by_win_rate", params: {gameType: this.gameType()}}}
				>
					<HideLoading>
						<DeckStats
							playerClass={this.props.deckClass}
							deckId={this.props.deckId}
						/>
					</HideLoading>
				</DataInjector>
				<DataInjector
					dataManager={this.dataManager}
					fetchCondition={this.isWildDeck() !== undefined}
					query={{url: "single_account_lo_individual_card_stats_for_deck", params: {deck_id: this.props.deckId}}}
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
									query={{
										params: this.getParams(),
										url: (
											this.state.selectedClasses[0] !== "ALL" && this.props.userIsPremium
											? "single_deck_mulligan_guide_by_class"
											: "single_deck_mulligan_guide"
										),
									}}
								>
									<TableLoading cardData={this.props.cardData}>
										<DeckBreakdownTable
											dataKey={this.state.selectedClasses[0]}
											onSortChanged={(sortBy: string, sortDirection: SortDirection) => this.setState({sortBy, sortDirection})}
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
								query={{url: "list_decks_by_win_rate", params: this.getParams()}}
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
							<div className="table-wrapper">
								<DataInjector
									dataManager={this.dataManager}
									fetchCondition={this.isWildDeck() !== undefined}
									query={{
										params: {deck_id: this.props.deckId, gameType: this.gameType()},
										url: "single_account_lo_individual_card_stats_for_deck",
									}}
								>
									<TableLoading cardData={this.props.cardData}>
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
						</div>
					</div>
				</section>
			</main>
		</div>;
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
