import moment from "moment";
import * as React from "react";
import CardData from "../CardData";
import PopularityLineChart from "../components/charts/PopularityLineChart";
import WinrateLineChart from "../components/charts/WinrateLineChart";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import DeckBreakdownTable from "../components/deckdetail/DeckBreakdownTable";
import MyCardStatsTable from "../components/deckdetail/MyCardStatsTable";
import SimilarDecksList from "../components/deckdetail/SimilarDecksList";
import HDTButton from "../components/HDTButton";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import PremiumWrapper from "../components/PremiumWrapper";
import {SortDirection} from "../components/SortableTable";
import {
	getDustCost, getHeroCardId,
	isReady, toPrettyNumber, toTitleCase, wildSets,
} from "../helpers";
import {MyDecks, RenderData, TableData, TableQueryData} from "../interfaces";
import QueryManager from "../QueryManager";

interface TableDataCache {
	[key: string]: TableData;
}

interface DeckDetailState {
	averageDuration?: RenderData;
	baseWinrates?: TableData;
	deckData?: TableData;
	expandWinrate?: boolean;
	myDecks?: MyDecks;
	personalCardData: TableData;
	personalSortBy?: string;
	personalSortDirection?: SortDirection;
	rankRange?: string;
	selectedClasses?: FilterOption[];
	showInfo?: boolean;
	similarDecks?: TableData;
	sortBy?: string;
	sortDirection?: SortDirection;
	statsOverTime?: RenderData;
	tableDataAll?: TableDataCache;
	tableDataClasses?: TableDataCache;
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
	private readonly queryManager: QueryManager = new QueryManager();

	constructor(props: DeckDetailProps, state: DeckDetailState) {
		super(props, state);
		this.state = {
			averageDuration: "loading",
			baseWinrates: "loading",
			deckData: "loading",
			expandWinrate: false,
			myDecks: null,
			personalCardData: "loading",
			personalSortBy: "card",
			personalSortDirection: "ascending",
			rankRange: "ALL",
			selectedClasses: ["ALL"],
			showInfo: false,
			similarDecks: "loading",
			sortBy: "decklist",
			sortDirection: "ascending",
			statsOverTime: "loading",
			tableDataAll: {},
			tableDataClasses: {},
		};
		this.fetchMyDecks();
	}

	getDeckName(): string {
		return this.props.deckName || toTitleCase(this.props.deckClass) + " Deck";
	}

	cacheKey(state?: DeckDetailState): string {
		return (state || this.state).rankRange || "ALL";
	}

	componentDidUpdate(prevProps: DeckDetailProps, prevState: DeckDetailState) {
		if (!prevProps.cardData && this.props.cardData) {
			this.fetchDecksList();
		}
		if (!isReady(prevState.deckData) && isReady(this.state.deckData) && this.hasGlobalData()) {
			this.fetchGlobalStats();
			this.fetchMulliganGuide();
		}
		if (!prevState.myDecks && this.state.myDecks) {
			const deck = this.state.myDecks[this.props.deckId];
			if (deck && Object.keys(deck.game_types).indexOf("BGT_ARENA") === -1) {
				this.fetchPersonalStats();
			}
		}
		if (this.hasGlobalData()) {
			const cacheKey = this.cacheKey();
			const prevCacheKey = this.cacheKey(prevState);
			if (cacheKey !== prevCacheKey) {
				let all = this.state.tableDataAll[cacheKey];
				let byClass = this.state.tableDataClasses[cacheKey];
				if (!all || all === "error" || !byClass || byClass === "error") {
					this.fetchMulliganGuide();
				}
			}
		}
	}

	render(): JSX.Element {
		const selectedClass = this.state.selectedClasses[0];
		const allSelected = selectedClass === "ALL";

		let replayCount = null;
		const selectedTable = (allSelected ? this.state.tableDataAll : this.state.tableDataClasses)[this.cacheKey()];
		if (selectedTable && selectedTable !== "loading" && selectedTable !== "error") {
			const metadata = selectedTable.series.metadata;
			const numGames = allSelected ? metadata["total_games"] : metadata[selectedClass]["total_games"];
			replayCount = (
				<span className="replay-count">{"based on " + toPrettyNumber(numGames) + " replays"}</span>
			);
		}

		const title = [
			<img src={STATIC_URL + "images/class-icons/alt/" + this.props.deckClass.toLocaleLowerCase() + ".png"}/>,
			<h1>{this.getDeckName()}</h1>,
		];

		const winrates = [];
		if (this.state.baseWinrates !== "loading" && this.state.baseWinrates !== "error") {
			const data = Object.assign({}, this.state.baseWinrates.series.data);
			const keys = Object.keys(data);
			keys.sort((a, b) => data[a][0]["player_class"] > data[b][0]["player_class"] ? 1 : -1);
			keys.forEach((key) => {
				const winrate = +data[key][0]["win_rate"];
				winrates.push(
					<li>
						vs. {toTitleCase(data[key][0]["player_class"])}
						<span className="infobox-value">{(+winrate).toFixed(1) + "%"}</span>
					</li>,
				);
			});
		}

		let dustCost = 0;
		if (this.props.cardData) {
			this.props.deckCards.split(",").forEach((id) => {
				const card = this.props.cardData.fromDbf(id);
				dustCost += getDustCost(card);
			});
		}

		let hdtButton = null;
		if (this.props.cardData) {
			hdtButton = (
				<HDTButton
					card_ids={this.props.deckCards.split(",").map((dbfId) => this.props.cardData.fromDbf(dbfId).id)}
					class={this.props.deckClass}
					name={this.getDeckName()}
					sourceUrl={window.location.toString()}
				/>
			);
		}

		const deckNameStyle = {
			backgroundImage: "url(/static/images/class-icons/" + this.props.deckClass.toLowerCase() + ".png",
		};

		const dustCostStyle = {
			backgroundImage: "url(/static/images/dust.png",
		};

		let deckData = [];
		if (this.state.deckData && this.state.deckData !== "loading" && this.state.deckData !== "error") {
			const deck = this.state.deckData.series.data[this.props.deckClass].find((x) => +x["deck_id"] === this.props.deckId);
			if (deck) {
				const winrateClassNames = [];
				let subWinrates = null;

				if (winrates.length) {
					winrateClassNames.push("selectable", "expandable");
					if (this.state.expandWinrate) {
						winrateClassNames.push("expanded");
						subWinrates = (
							<ul>{winrates}</ul>
						);
					}
				}

				deckData.push(
					<h2>Data</h2>,
					<ul>
						<li>
							Based on
							<span className="infobox-value">{toPrettyNumber(+deck["total_games"]) + " replays"}</span>
						</li>
						<li>
							Time frame
							<span className="infobox-value">Last 30 days</span>
						</li>
						<li
							className={winrateClassNames.join(" ")}
							onClick={() => this.setState({expandWinrate: !this.state.expandWinrate})}
						>
							Winrate
							<span className="infobox-value">{(+deck["win_rate"]).toFixed(1) + "%"}</span>
							{subWinrates}
						</li>
						<li>
							Avg. match duration
							<span className="infobox-value">
								{moment.duration(+deck["avg_game_length_seconds"], "second").asMinutes().toFixed(1) + " minutes"}
							</span>
						</li>
						<li>
							Avg. number of turns
							<span className="infobox-value">{deck["avg_num_player_turns"]}</span>
						</li>
					</ul>,
				);
			}
		}

		let personalCardStats = null;
		if (!this.state.myDecks) {
			personalCardStats = <h3 className="message-wrapper">Loading...</h3>;
		}
		else if (this.state.myDecks[this.props.deckId]) {
			const deck = this.state.myDecks[this.props.deckId];
			deckData.push(
				<h2>Personal</h2>,
				<ul>
					<li>
						Games
						<span className="infobox-value">{deck.total_games}</span>
					</li>
					<li>
						Winrate
						<span className="infobox-value">{(+deck["win_rate"] * 100).toFixed(1) + "%"}</span>
					</li>
					<li>
						Match duration
						<span className="infobox-value">
							{moment.duration(+deck["avg_game_length_seconds"], "second").asMinutes().toFixed(1) + " minutes"}
						</span>
					</li>
					<li>
						Number of turns
						<span className="infobox-value">{deck["avg_num_turns"]}</span>
					</li>
				</ul>,
			);
			personalCardStats = (
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
					personalData={this.state.personalCardData}
					sortBy={this.state.personalSortBy}
					sortDirection={this.state.personalSortDirection as SortDirection}
				/>
			);
		}
		else {
			personalCardStats = <h3 className="message-wrapper">You have not played this deck recently.</h3>;
		}

		let headerContent = null;
		if (this.isArenaDeck()) {
			headerContent = <h3 className="message-wrapper">We currently dont't have stats for arena decks.</h3>;
		}
		else {
			headerContent = [
				<div className="col-lg-6 col-md-6">
					<div className="chart-wrapper wide">
						<PopularityLineChart
							renderData={this.state.statsOverTime}
							widthRatio={2}
							maxYDomain={10}
						/>
					</div>
				</div>,
				<div className="col-lg-6 col-md-6">
					<div className="chart-wrapper wide">
						<WinrateLineChart
							renderData={this.state.statsOverTime}
							widthRatio={2}
						/>
					</div>
				</div>,
			];
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
				{deckData}
			</aside>
			<main>
				<section id="content-header">
					{headerContent}
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
								<DeckBreakdownTable
									cardData={this.props.cardData}
									dataKey={selectedClass}
									onSortChanged={(sortBy: string, sortDirection: SortDirection) => this.setState({sortBy, sortDirection})}
									rawCardsList={this.props.deckCards}
									sortBy={this.state.sortBy}
									sortDirection={this.state.sortDirection}
									tableData={selectedTable}
									wildDeck={this.isWildDeck()}
								/>
							</div>
						</div>
						<div id="similar-decks" className="tab-pane fade">
							<SimilarDecksList
								cardData={this.props.cardData}
								playerClass={this.props.deckClass}
								deckData={this.state.deckData}
								rawCardList={this.props.deckCards}
								wildDeck={this.isWildDeck()}
							/>
						</div>
						<div id="my-stats" className="tab-pane fade">
							<div className="table-wrapper">
								{personalCardStats}
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

	hasGlobalData(): boolean {
		if (!isReady(this.state.deckData)) {
			return false;
		}
		const classDecks = (this.state.deckData as TableQueryData).series.data[this.props.deckClass];
		return classDecks.some((x) => +x.deck_id === this.props.deckId);
	}

	isArenaDeck(): boolean {
		if (!this.state.myDecks) {
			return false;
		}
		const deck = this.state.myDecks[this.props.deckId];
		return deck && Object.keys(deck.game_types).indexOf("BGT_ARENA") !== -1;
	}

	getGameType(): string {
		return this.isWildDeck() ? "RANKED_WILD" : "RANKED_STANDARD";
	}

	getQueryParams(): string {
		return "deck_id=" + this.props.deckId + "&GameType=" + this.getGameType();
	}

	fetchMulliganGuide(): void {
		const mode = this.isWildDeck() ? "RANKED_WILD" : "RANKED_STANDARD";
		const params = "deck_id=" + this.props.deckId + "&GameType=" + mode + "&RankRange=" + (this.state.rankRange || "ALL");
		const cacheKey = this.cacheKey();

		if (this.props.userIsPremium) {
			this.queryManager.fetch(
				"/analytics/query/single_deck_mulligan_guide_by_class?" + params,
				(data) => {
					const newState = Object.assign({}, this.state.tableDataClasses);
					newState[cacheKey] = data;
					this.setState({tableDataClasses: newState});
				},
			);
		}

		this.queryManager.fetch(
			"/analytics/query/single_deck_mulligan_guide?" + params,
			(data) => {
				const newState = Object.assign({}, this.state.tableDataAll);
				newState[cacheKey] = data;
				this.setState({tableDataAll: newState});
			},
		);
	}

	fetchGlobalStats(): void {
		const params = this.getQueryParams();
		this.queryManager.fetch(
			"/analytics/query/single_deck_base_winrate_by_opponent_class?" + params,
			(data) => this.setState({baseWinrates: data}),
		);
		this.queryManager.fetch(
			"/analytics/query/single_deck_stats_over_time?" + params,
			(data) => this.setState({statsOverTime: data}),
		);
	}

	fetchDecksList(): void {
		this.queryManager.fetch(
			"/analytics/query/list_decks_by_win_rate?GameType=" + this.getGameType(),
			(data) => this.setState({deckData: data}),
		);
	}

	fetchMyDecks(): void {
		this.queryManager.fetch("/decks/mine/", (data) => this.setState({myDecks: data}));
	}

	fetchPersonalStats(): void {
		this.queryManager.fetch(
			"/analytics/query/single_account_lo_individual_card_stats_for_deck?deck_id=" + this.props.deckId,
			(data) => this.setState({personalCardData: data}),
		);
	}
}
