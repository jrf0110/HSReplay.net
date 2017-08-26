import CardList from "../components/CardList";
import * as React from "react";
import TabList from "../components/layout/TabList";
import Tab from "../components/layout/Tab";
import {toTitleCase} from "../helpers";
import DataManager from "../DataManager";
import LoadingSpinner from "../components/LoadingSpinner";
import {VictoryAxis, VictoryChart, VictoryLabel, VictoryLegend, VictoryScatter, VictoryZoomContainer} from "victory";
import {AutoSizer} from "react-virtualized";
import CardData from "../CardData";
import DataInjector from "../components/DataInjector";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import InfoboxFilter from "../components/InfoboxFilter";
import ArchetypeSelector from "../components/ArchetypeSelector";
import {ApiArchetype, ApiArchetypeSignature, ApiTrainingDataDeck} from "../interfaces";
import HideLoading from "../components/loading/HideLoading";
import ArchetypeTrainingSettings from "../components/ArchetypeTrainingSettings";
import ArchetypeSignature from "../components/archetypedetail/ArchetypeSignature";

interface ClassData {
	[playerClass: string]: ClusterData;
}

interface ClusterData {
	data: DeckData[];
	signatures: {[id: number]: Array<[number, number]>};
}

interface DeckData {
	metadata: ClusterMetaData;
	x: number;
	y: number;
}

interface ClusterMetaData {
	archetype: number;
	archetype_name: string;
	deck_list: string;
	games: number;
	shortid: string;
	win_rate: number;
}

interface ArchetypeAnalysisState {
	allowZoom?: boolean;
	data: ClassData;
	deckData: ApiTrainingDataDeck;
	selectedData?: ClusterMetaData;
	selectedPlayerClass?: string;
	showSignature?: boolean;
}

interface ArchetypeAnalysisProps extends React.ClassAttributes<ArchetypeAnalysis> {
	cardData: CardData;
	format?: string;
	labels?: string;
	opacityScaling?: string;
	setFormat?: (format: string) => void;
	setLabels?: (counts: string) => void;
	setOpacityScaling?: (opacityScaling: string) => void;
	setSizeScaling?: (sizeScaling: string) => void;
	setTab?: (tab: string) => void;
	sizeScaling?: string;
	tab?: string;
}

const colors = [
	"#666666", "#3366CC", "#DC3912", "#FF9900", "#109618", "#990099",
	"#00BBC6", "#FD4477", "#85AA00", "#3123D5", "#994499", "#AAAA11",
	"#6633CC", "#E67300", "#8B0707", "#A29262", "#BAB4B6",
];

export default class ArchetypeAnalysis extends React.Component<ArchetypeAnalysisProps, ArchetypeAnalysisState> {
	constructor(props: ArchetypeAnalysisProps, state: ArchetypeAnalysisState) {
		super(props, state);
		this.state = {
			allowZoom: false,
			data: null,
			deckData: null,
			selectedData: null,
			selectedPlayerClass: null,
			showSignature: false,
		};
		this.fetchData(props.format);
	}

	componentWillMount() {
		document.addEventListener("keydown", this.handleKeyDown);
		document.addEventListener("keyup", this.handleKeyUp);
	}

	componentWillUnmount() {
		document.removeEventListener("keydown", this.handleKeyDown);
		document.removeEventListener("keyup", this.handleKeyUp);
	}

	handleKeyDown = (event) => {
		if (event.key === "Shift" && !this.state.allowZoom) {
			this.setState({allowZoom: true});
		}
	}

	handleKeyUp = (event) => {
		if (event.key === "Shift" && this.state.allowZoom) {
			this.setState({allowZoom: false});
		}
	}

	fetchData(format: string) {
		DataManager.get("/analytics/clustering/data/" + format + "/").then((data) => {
			if (this.props.format !== format) {
				return;
			}
			const classData: ClassData = {};
			data.forEach((playerClassData) => {
				classData[playerClassData.player_class] = playerClassData;
			});
			this.setState({data: classData});
		});
	}

	fetchDeckData(deckId: string) {
		DataManager.get("/api/v1/decks/" + deckId + "/").then((data) => {
			this.setState({deckData: data});
		});
	}

	componentWillReceiveProps(nextProps: ArchetypeAnalysisProps) {
		if (this.props.format !== nextProps.format) {
			this.setState({data: null});
			this.fetchData(nextProps.format);
		}
	}

	render(): JSX.Element {
		return (
			<div className="archetype-analysis-container">
				<aside className="infobox">
					<h1>Archetype Analysis</h1>
					<InfoboxFilterGroup
						header="Format"
						selectedValue={this.props.format}
						onClick={(format) => this.props.setFormat(format)}
					>
						<InfoboxFilter value="FT_STANDARD">Standard</InfoboxFilter>
						<InfoboxFilter value="FT_WILD">Wild</InfoboxFilter>
					</InfoboxFilterGroup>
					<h2>Settings</h2>
					<InfoboxFilter
						deselectable="true"
						onClick={(value) => this.props.setLabels(value)}
						value={"show"}
						selected={this.props.labels === "show"}
					>
						Show labels
					</InfoboxFilter>
					<InfoboxFilter
						deselectable="true"
						onClick={(value) => this.props.setSizeScaling(value)}
						value={"true"}
						selected={this.props.sizeScaling === "true"}
					>
						Scale size by games
					</InfoboxFilter>
					<InfoboxFilter
						deselectable="true"
						onClick={(value) => this.props.setOpacityScaling(value)}
						value={"true"}
						selected={this.props.opacityScaling === "true"}
					>
						Scale opacity by winrate
					</InfoboxFilter>
					<h2>
						Deck
						<a
							className="infobox-value"
							href="#"
							onClick={(e) => {
								e.preventDefault();
								this.setState({showSignature: !this.state.showSignature});
							}}
						>
							{this.state.showSignature ? "show deck" : "show signature"}
						</a>
					</h2>
					{this.renderDeckInfo()}
				</aside>
				<main>
					<TabList tab={this.props.tab} setTab={(tab) => this.props.setTab(tab)}>
						{this.renderClassTabs()}
					</TabList>
				</main>
			</div>
		);
	}

	renderClassTabs(): JSX.Element[] {
		return [
			"DRUID", "HUNTER", "MAGE",
			"PALADIN", "PRIEST", "ROGUE",
			"SHAMAN", "WARLOCK", "WARRIOR",
		].map((playerClass) => this.renderClassTab(playerClass));
	}

	renderClassTab(playerClass: string): JSX.Element {
		return (
			<Tab id={playerClass} label={this.renderTabLabel(playerClass)}>
				{this.renderTabContent(playerClass)}
			</Tab>
		);
	}

	renderTabContent(playerClass: string): JSX.Element {
		const {labels, opacityScaling, sizeScaling} = this.props;
		return (
			<div style={{width: "100%", height: "calc(100vh - 95px)"}}>
				<AutoSizer>
					{({height, width}) => {
						if (this.state.data === null) {
							return <LoadingSpinner active={true}/>;
						}
						const data = this.state.data[playerClass] && this.state.data[playerClass].data;
						if (!data) {
							return <h3 className="message-wrapper">No data</h3>;
						}

						let maxGames = 0;
						let maxWinrate = 0;
						let minWinrate = 100;
						const archetypeIds = [];
						const archetypes = {};
						data.forEach((d) => {
							if (archetypeIds.indexOf(+d.metadata.archetype) === -1) {
								archetypeIds.push(+d.metadata.archetype);
								archetypes[d.metadata.archetype] = d.metadata.archetype_name;
							}
							if (d.metadata.games > maxGames) {
								maxGames = d.metadata.games;
							}
							if (d.metadata.win_rate > maxWinrate) {
								maxWinrate = d.metadata.win_rate;
							}
							if (d.metadata.win_rate < minWinrate) {
								minWinrate = d.metadata.win_rate;
							}
						});
						data.forEach((d) => {
							if (opacityScaling === "true") {
								const wr = Math.max(10, d.metadata.win_rate - minWinrate);
								d["opacity"] = wr / (maxWinrate - minWinrate);
							}
							else {
								d["opacity"] = null;
							}
						});
						archetypeIds.sort();
						const legendData = archetypeIds.map((id, index) => {
							return {
								color: colors[index],
								name: archetypes[id],
								symbol: {type: id === -1 ? "diamond" : "square"},
							};
						});
						const axisLabelSize = height / 100;
						const selectedId = this.state.selectedData && this.state.selectedData.shortid;
						const minSize = 5;
						const maxSize = 25;
						return (
							<div style={{position: "absolute", width: "100%", height: "100%"}}>
								<span style={{padding: "3px", opacity: 0.6, position: "absolute"}}>Hold <kbd>Shift</kbd> to unlock zoom</span>
								<VictoryChart
									height={height}
									width={width}
									padding={30}
									domainPadding={30}
									containerComponent={
										<VictoryZoomContainer allowZoom={this.state.allowZoom}/>}
								>
									<VictoryAxis crossAxis={true} dependentAxis={true} style={{tickLabels: {fontSize: axisLabelSize}}}/>
									<VictoryAxis crossAxis={true} style={{tickLabels: {fontSize: axisLabelSize}}}/>
									<VictoryScatter
										data={this.state.data[playerClass].data}
										size={(p) => {
											if (sizeScaling === "true") {
												return ((p.metadata.games / maxGames) * (maxSize - minSize) + minSize);
											}
											return 6;
										}}
										style={{
											data: {
												cursor: "pointer",
												fill: (p) => colors[archetypeIds.indexOf(p.metadata.archetype)] || "gray",
												stroke: "black",
												strokeWidth: 1.5,
											},
										}}
										symbol={(p) => p.metadata.archetype === -1 ? "diamond" : "circle"}
										events={[{
											eventHandlers: {
												onClick: () => {
													return [{
														mutation: (props) => {
															const metadata = props.datum.metadata;
															this.setState({
																deckData: null,
																selectedData: metadata,
																selectedPlayerClass: playerClass,
															});
															this.fetchDeckData(metadata.shortid);
														},
														target: "data",
													}];
												},
												onMouseEnter: (e) => {
													return [{
														mutation: (props) => {
															return {
																style: Object.assign({}, props.style, {strokeWidth: 2}),
															};
														},
													}];
												},
												onMouseLeave: () => {
													return [{
														mutation: (props) => {
															return null;
														},
													}];
												},
											},
											target: "data",
										}]}
										labels={(p) => {
											if (labels === "show") {
												return `Games: ${p.metadata.games}\nWinrate: ${p.metadata.win_rate}%`;
											}
											return "";
										}}
										labelComponent={
											<VictoryLabel
												{...{hack: labels} as any}
											/>
										}
										{...{opacityScaling, sizeScaling}}
									/>
									<VictoryLegend
										data={legendData}
										orientation="vertical"
										style={{
											data: {
												fill: (d) => d.color,
												size: 6,
												stroke: "black",
												strokeWidth: 1.5,
											},
										}}
									/>
								</VictoryChart>
							</div>
						);
					}}
				</AutoSizer>
			</div>
		);
	}

	renderTabLabel(playerClass: string): JSX.Element {
		return (
			<span className={"player-class " + playerClass.toLowerCase()}>
				{toTitleCase(playerClass)}
			</span>
		);
	}

	renderDeckInfo(): JSX.Element|JSX.Element[] {
		const {deckData, selectedData, selectedPlayerClass} = this.state;
		if (selectedData === null) {
			return (
				<div className="message-wrapper">
					Click any deck
				</div>
			);
		}
		if (deckData === null) {
			return (
				<div className="message-wrapper">
					Loading...
				</div>
			);
		}
		if (this.state.showSignature) {
			const signature: ApiArchetypeSignature = {
				as_of: null,
				components: this.state.data[selectedPlayerClass].signatures[selectedData.archetype],
				format: null,
			};
			return [
				<ul>
					<li>
						Cluster
						<span className="infobox-value">{selectedData.archetype_name}</span>
					</li>
				</ul>,
				<ArchetypeSignature
					cardData={this.props.cardData}
					showOccasional={true}
					showValues={true}
					signature={signature}
				/>,
			];
		}
		const cardList = [];
		JSON.parse(selectedData.deck_list).forEach((c: any[]) => {
			for (let i = 0; i < c[1]; i++) {
				cardList.push(c[0]);
			}
		});
		return [
			<CardList
				cardData={this.props.cardData}
				cardList={cardList}
				name=""
				heroes={[]}
			/>,
			<ul>
				<li>
					Name
					<span className="infobox-value">{selectedData.archetype_name}</span>
				</li>
				<li>
					Games
					<span className="infobox-value">{selectedData.games}</span>
				</li>
				<li>
					Winrate
					<span className="infobox-value">{selectedData.win_rate}</span>
				</li>
				<li>
					View deck details
					<a href={"/decks/" + deckData.shortid + "/"} className="infobox-value">Deck details link</a>
				</li>
				<li>
					<span>View in Admin</span>
					<span className="infobox-value">
						<a href={`/admin/decks/deck/${deckData.id}/change`}>Admin link</a>
					</span>
				</li>
				<li>
					<span>Refresh Data</span>
					<span className="infobox-value">
						<a
							href="#"
							onClick={(e) => {
								e.preventDefault();
								DataManager.get(`/analytics/clustering/refresh/${this.props.format}`, {}, true).then(() => {
									window.alert("Okay");
								});
							}}
						>
							Refresh
						</a>
					</span>
				</li>
				<li>
					<span>Archetype</span>
					<span className="infobox-value">
						<DataInjector
							query={[
								{key: "archetypeData", url: "/api/v1/archetypes/", params: {}},
							]}
							extract={{
								archetypeData: (data: ApiArchetype[]) => {
									const archetypes = data.filter((a) => a.player_class_name === selectedPlayerClass);
									return {archetypes};
								},
							}}
						>
							<HideLoading>
								<ArchetypeSelector deckId={deckData.shortid} defaultSelectedArchetype={deckData.archetype} />
							</HideLoading>
						</DataInjector>
					</span>
				</li>
				<li>
					<DataInjector
						query={{key: "trainingData", url: "/api/v1/archetype-training/", params: {}}}
						extract={{
							trainingData: (trainingData) => {
								const data = trainingData.find((d) => d.deck.shortid === deckData.shortid);
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
								deckId={deckData.shortid}
								playerClass={selectedPlayerClass}
							/>
						</HideLoading>
					</DataInjector>
				</li>
			</ul>,
		];
	}
}
