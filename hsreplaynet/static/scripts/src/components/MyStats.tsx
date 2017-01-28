import * as React from "react";
import ArchetypeClient from "../ArchetypeClient";
import ArchetypeTable from "./ArchetypeTable";
import ArchetypeWinrateBarChart from "./charts/ArchetypeWinrateBarChart";
import ClassDistributionPieChart from "./charts/ClassDistributionPieChart";
import ClassPieChartConverter from "../ClassPieChartConverter";
import DeckList from "./DeckList";
import GameHistorySelectFilter from "./GameHistorySelectFilter";
import HearthstoneJSON from "hearthstonejson";
import InfoBoxSection from "./InfoBoxSection";
import Pager from "./Pager";
import RankLineChart from "./charts/RankLineChart";
import {ArchetypeData, ReplayFilter} from "../interfaces";
import {BnetGameType} from "../hearthstone";
import Selection from "./Selection";

type ChartType = "rank" | "legendRank" | "winrate";

interface MyStatsState {
	archetypeClient?: ArchetypeClient;
	archetypeData?: ArchetypeData;
	deckData?: Map<string, any>;
	db?: Map<string, any>;
	loadingDb?: boolean;
	lookback?: number;
	offset?: number;
	gametypes?: any[];
	minRank?: number;
	maxRank?: number;
	selectedArchetype?: string;
	numGames?: number;
	page?: number;
	fetching?: number;
	season?: "previous" | "current";
	displayedChart?: ChartType;
	selectedMode?: "ranked" | "casual";
	selectedFormat?: "standard" | "wild";
	dataFoo?: any[];
}

interface MyStatsProps extends React.ClassAttributes<MyStats> {
	cardData: Map<string, any>;
}

export default class MyStats extends React.Component<MyStatsProps, MyStatsState> {

	private readonly converter = new ClassPieChartConverter();
	private readonly pageSize = 12;
	private readonly rankData = [
		{date: new Date(2017, 0, 1), rank: 25},
		{date: new Date(2017, 0, 2), rank: 23},
		{date: new Date(2017, 0, 3), rank: 22},
		{date: new Date(2017, 0, 4), rank: 20},
		{date: new Date(2017, 0, 5), rank: 21},
		{date: new Date(2017, 0, 6), rank: 19},
		{date: new Date(2017, 0, 7), rank: 19},
		{date: new Date(2017, 0, 8), rank: 18},
		{date: new Date(2017, 0, 9), rank: 16},
		{date: new Date(2017, 0, 10), rank: 16},
		{date: new Date(2017, 0, 11), rank: 15},
		{date: new Date(2017, 0, 12), rank: 13},
		{date: new Date(2017, 0, 13), rank: 13},
		{date: new Date(2017, 0, 14), rank: 12},
		{date: new Date(2017, 0, 15), rank: 13},
		{date: new Date(2017, 0, 16), rank: 14},
		{date: new Date(2017, 0, 17), rank: 12},
		{date: new Date(2017, 0, 18), rank: 5},
		{date: new Date(2017, 0, 19), rank: 3},
		{date: new Date(2017, 0, 20), rank: 2},
		{date: new Date(2017, 0, 21), rank: 2},
		{date: new Date(2017, 0, 22), rank: 2},
		{date: new Date(2017, 0, 23), rank: 1},
		{date: new Date(2017, 0, 24), rank: 1},
		{date: new Date(2017, 0, 26), rank: 1123, legend: true},
		{date: new Date(2017, 0, 27), rank: 1300, legend: true},
		{date: new Date(2017, 0, 28), rank: 1211, legend: true},
		{date: new Date(2017, 0, 29), rank: 999, legend: true},
		{date: new Date(2017, 0, 30), rank: 623, legend: true},
		{date: new Date(2017, 0, 31), rank: 866, legend: true},
	];

	constructor(props: MyStatsProps, state: any) {
		super(props, state);
		this.state = {
			archetypeClient: new ArchetypeClient(),
			archetypeData: {},
			lookback: 1,
			offset: 0,
			gametypes: [BnetGameType.BGT_RANKED_STANDARD],
			minRank: 11,
			maxRank: 25,
			selectedArchetype: "",
			numGames: 5,
			deckData: new Map<string, any>(),
			db: new Map<string, any>(),
			loadingDb: false,
			page: 0,
			fetching: 1,
			season: "current",
			displayedChart: "rank",
			selectedMode: "ranked",
			selectedFormat: "standard",
			dataFoo: null,
		}
		fetch("/static/data.json", {
			credentials: "include",
		}).then((response) => {
			return response.json();
		}).then((json: any) => {
			this.setState({dataFoo: json})
		});
		this.loadDb();
		this.fetchData();
	}

	fetchData(): void {
		console.log("fetching...", this.state.season)
		let season = this.selectedSeason();
		this.setState({fetching: this.state.fetching + 1});
		this.state.archetypeClient.fetchArchetypeData(
			season[0],
			season[1],
			[this.selectedGameType()],
			this.state.minRank,
			this.state.maxRank,
			(data) => this.setState({archetypeData: data, fetching: Math.max(this.state.fetching - 1, 0)})
		);
		if (!this.state.deckData.size) {
			this.state.archetypeClient.fetchDeckData(
				(data) => {
					let map = new Map<string, any>();
					data.forEach(arch => map.set(arch.name, arch));
					this.setState({deckData: map});
				}
			);
		}
	}

	selectedSeason(): [number, number] {
		let lookback = 1;
		let offset = 0;
		if (this.state.season === "current") {
			// lookback = new Date().getDate();
		}
		else if (this.state.season === "previous") {
			const date = new Date();
			offset = date.getDate();
			date.setDate(1);
			date.setHours(-1);
			lookback = date.getDate();
		}
		return [lookback, offset];
	}

	selectedGameType(): BnetGameType {
		if (this.state.selectedMode === "ranked") {
			if(this.state.selectedFormat === "standard") {
				return BnetGameType.BGT_RANKED_STANDARD;
			}
			else {
				return BnetGameType.BGT_RANKED_WILD;
			}
		}
		else {
			if(this.state.selectedFormat === "standard") {
				return BnetGameType.BGT_CASUAL_STANDARD;
			}
			else {
				return BnetGameType.BGT_CASUAL_WILD;
			}
		}
	}

	componentDidUpdate(prevProps: MyStatsProps, prevState: MyStatsState) {
		console.log("updating...")
		if (this.state.lookback !== prevState.lookback
			|| this.state.offset !== prevState.offset
			|| this.state.gametypes !== prevState.gametypes
			|| this.state.minRank !== prevState.minRank
			|| this.state.maxRank !== prevState.maxRank
			|| this.state.season !== prevState.season
			|| this.state.selectedMode !== prevState.selectedMode
			|| this.state.selectedFormat !== prevState.selectedFormat) {
				this.fetchData();
		}
		return true;
	}

	render(): JSX.Element {
		let filterData = this.getFilters();
		let filters = [];
		filterData.forEach(filter => {
			filters.push(
				<li>
					<GameHistorySelectFilter
						default={filter.default}
						options={filter.options}
						selected={this.state[filter.name]}
						onChanged={(value: string) => {
							let state = {};
							state[filter.name] = value;
							this.setState(state);
						}}
					/>
				</li>
			)
		});
		let pieChartData = [];
		let barChartData = [];
		let deckData = null;
		let numkeys = 0;
		if (this.state.archetypeData.winrates) {
			if (!this.state.selectedArchetype) {
				this.state.selectedArchetype = Object.keys(this.state.archetypeData.winrates)[0];
			}
			const winrates = this.state.archetypeData.winrates[this.state.selectedArchetype];
			Object.keys(winrates).forEach(key => {
				if (winrates[key].match_count > 0) {
					numkeys++;
				}
			});
			pieChartData = this.converter.fromArchetypeData(winrates, this.state.deckData);
			barChartData = this.converter.barDataFromArchetypeData(winrates, this.state.deckData);
			barChartData = barChartData.slice(0, this.state.numGames).reverse();
			deckData = this.state.deckData.get(this.state.selectedArchetype);
		}
		return (
			<div className="row">
				<div className="col-md-12 col-sm-12 col-xs-12">
					<div className="row">
						<div className="col-md-3 col-sm-3 col-xs-12">
							<div className="infobox" id="myreplays-infobox">
								<InfoBoxSection header="Filters" collapsedSizes={["xs", "sm"]} headerStyle="h1">
									<ul>
										<li>
											<Selection
												name="Gametype"
												visibleOptions={["Ranked", "Casual"]}
												collapsedOptions={["Arena", "Brawl"]}
												defaultSelection="Ranked"
											/>
										</li>
										<li>
											<Selection
												name="Format"
												visibleOptions={["Standard", "Wild"]}
												defaultSelection="Standard"
											/>
										</li>
										<li>
											<Selection
												name="Season"
												visibleOptions={["Previous", "Current"]}
												collapsedOptions={["November 2016", "October 2016"]}
												defaultSelection="Current"
											/>
										</li>
										<li>
											<Selection
												name="Rank"
												visibleOptions={["Legend - 10", "11 - 25"]}
												collapsedOptions={["Legend", "1 - 5", "6 - 10", "11 - 15", "16 - 20", "21 - 25"]}
												defaultSelection="11 - 25"
											/>
										</li>
									</ul>
								</InfoBoxSection>
							<div>
								<ArchetypeTable
									data={this.state.archetypeData}
									deckData={this.state.deckData}
									selectedArchetype={this.state.selectedArchetype}
									selectedChanged={(id) => this.setState({selectedArchetype: id})}
									offset={this.state.page * this.pageSize}
									count={this.pageSize}
								/>
								<div className="pull-left">
									{this.state.fetching > 0 ? "Loading..." : null}
								</div>
								<div className="pull-right">
									<Pager previous={this.previousPage()} next={this.nextPage()} />
								</div>
							</div>
							</div>
						</div>
						<div className="col-md-9 col-sm-9 col-xs-12">
							{this.state.selectedArchetype ?
								[<div className="row">
									<div>
										<h4 style={{float: "left"}}>Rank progression</h4>
										<div className="btn-group view-selector" style={{float: "right"}}>
											<button type="button" className={"btn btn-" + (this.state.displayedChart === "rank" ? "primary" : "default")} onClick={() => this.setState({displayedChart: "rank"})}>Rank</button>
											<button type="button" className={"btn btn-" + (this.state.displayedChart === "legendRank" ? "primary" : "default")} onClick={() => this.setState({displayedChart: "legendRank"})}>Legend Rank</button>
											<button type="button" className={"btn btn-" + (this.state.displayedChart === "winrate" ? "primary" : "default")} onClick={() => this.setState({displayedChart: "winrate"})}>Winrate</button>
										</div>
									</div>
									{this.state.displayedChart === "rank" ?
									<RankLineChart
										maxRank={0}
										minRank={25}
										mainData={this.rankData.filter(x => !x["legend"])}
									/>
									: (this.state.displayedChart === "legendRank" ?
										<RankLineChart
											mainData={this.rankData.filter(x => x["legend"])}
											maxRank={0}
											minRank={1400}
										/>
										: null)
									}
								</div>,
								<div className="row">
									<div><h4>Matchups</h4></div>
									<div className="col-md-4 col-sm-4 col-xs-12">
										<ClassDistributionPieChart
											data={pieChartData}
											loading={false}
											onPieceClicked={null}
											stroke="black"
											strokeWidth={1.5}
											fontColor="black"
										/>
									</div>
									<div className="col-md-8 col-sm-8 col-xs-12">
										<ArchetypeWinrateBarChart
											data={barChartData}
											height={Math.max(30 * Math.min(this.state.numGames, numkeys) + 70, 200)}
										/>
										{this.state.numGames >= numkeys ? null :
										<div style={{textAlign: "center"}}>
											<button type="button" className="btn btn-default" onClick={() => this.setState({numGames: 2 * this.state.numGames})}>Show more...</button>
										</div>}
									</div>
								</div>]
								: null}
						</div>
					</div>
				</div>
				<div className="col-md-0 col-sm-0 col-xs-0">
					<div >
						{deckData && false ?
							<div>
								<h4 style={{textAlign: "center"}}>{"Your most played " + this.state.selectedArchetype}</h4>
								<DeckList cardDb={this.state.db} cardHeight={30} cards={deckData.representative_deck.card_ids} class={deckData.player_class_name} name={deckData.name} />
							</div>
						: null}
					</div>
				</div>
			</div>
		);
	}

	previousPage(): () => void {
		if (!this.state.archetypeData || !this.state.archetypeData.winrates) {
			return;
		}
		if (this.state.page <= 0) {
			return;
		}
		return () => this.setState({page: this.state.page - 1});
	}

	nextPage(): () => void {
		if (!this.state.archetypeData || !this.state.archetypeData.winrates) {
			return;
		}
		if ((this.state.page + 1) * this.pageSize >= Object.keys(this.state.archetypeData.winrates).length) {
			return;
		}
		return () => this.setState({page: this.state.page + 1});
	}

	protected loadDb() {
		if (this.state.loadingDb) {
			return;
		}
		this.setState({loadingDb: true})
		new HearthstoneJSON().getLatest((cards) => this.buildDb(cards));
	}

	private buildDb(cards: any) {
		let map = new Map<string, any>();
		cards.forEach(card => map = map.set(card.id, card));
		this.setState({db: map, loadingDb: false});
	}

	getFilters(): ReplayFilter[] {
		return [
			{
				name: "region",
				default: "All Region",
				options: [["eu", "EU"],["us", "US"],["asia", "ASIA"],["china", "CHINA"]]
			},
		];
	}
}

