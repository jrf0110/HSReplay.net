import * as React from "react";
import CardData from "../CardData";
import TabList from "../components/layout/TabList";
import Tab from "../components/layout/Tab";
import {toTitleCase} from "../helpers";
import DataManager from "../DataManager";
import LoadingSpinner from "../components/LoadingSpinner";
import {VictoryAxis, VictoryChart, VictoryLegend, VictoryScatter, VictoryZoomContainer} from "victory";
import {AutoSizer} from "react-virtualized";
import CardList from "../components/CardList";
import DataInjector from "../components/DataInjector";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import InfoboxFilter from "../components/InfoboxFilter";
import ArchetypeSelector from "../components/ArchetypeSelector";
import {ApiArchetype, ApiTrainingDataDeck} from "../interfaces";
import HideLoading from "../components/loading/HideLoading";
import ArchetypeTrainingSettings from "../components/ArchetypeTrainingSettings";

interface ClassData {
	[playerClass: string]: ClusterData[];
}

interface ClusterData {
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
}

interface ArchetypeAnalysisState {
	allowZoom?: boolean;
	data: ClassData;
	deckData: ApiTrainingDataDeck;
	selectedData?: ClusterMetaData;
	selectedPlayerClass?: string;
}

interface ArchetypeAnalysisProps extends React.ClassAttributes<ArchetypeAnalysis> {
	cardData: CardData;
	counts?: string;
	format?: string;
	tab?: string;
	setFormat?: (format: string) => void;
	setTab?: (tab: string) => void;
	setCounts?: (counts: string) => void;
}

const colors = [
	"#3366CC", "#DC3912", "#FF9900", "#109618", "#990099", "#3B3EAC", "#0099C6",
	"#DD4477", "#66AA00", "#B82E2E", "#316395", "#994499", "#22AA99", "#AAAA11",
	"#6633CC", "#E67300", "#8B0707", "#329262", "#5574A6", "#3B3EAC",
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
				classData[playerClassData.player_class] = playerClassData.data;
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
						onClick={(value) => this.props.setCounts(value)}
						value={"show"}
						selected={this.props.counts === "show"}
					>
						Show count labels
					</InfoboxFilter>
					<h2>Deck</h2>
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
		return (
			<div className="foo" style={{width: "100%", height: "calc(100vh - 95px)"}}>
				<AutoSizer>
					{({height, width}) => {
						if (this.state.data === null) {
							return <LoadingSpinner active={true}/>;
						}
						const data = this.state.data[playerClass];
						if (!data) {
							return <h3 className="message-wrapper">No data</h3>;
						}
						const archetypeNames = [];
						data.forEach((d) => {
							if (archetypeNames.indexOf(d.metadata.archetype_name) === -1) {
								archetypeNames.push(d.metadata.archetype_name);
							}
						});
						archetypeNames.sort();
						const legendData = archetypeNames.map((name, index) => {
							return {name, symbol: {type: "square"}, color: colors[index]};
						});
						const axisLabelSize = height / 100;
						const selectedId = this.state.selectedData && this.state.selectedData.shortid;
						return (
							<div style={{position: "absolute", width: "100%", height: "100%"}}>
								<span style={{padding: "3px", opacity: 0.6}}>Hold <kbd>Shift</kbd> to zoom</span>
								<VictoryChart
									height={height}
									width={width}
									padding={30}
									domainPadding={30}
									containerComponent={
										<VictoryZoomContainer allowZoom={this.state.allowZoom}/>
									}
								>
									<VictoryAxis crossAxis={true} dependentAxis={true} style={{tickLabels: {fontSize: axisLabelSize}}}/>
									<VictoryAxis crossAxis={true} style={{tickLabels: {fontSize: axisLabelSize}}}/>
									<VictoryScatter
										data={this.state.data[playerClass]}
										size={(p) => p.metadata.shortid === selectedId ? 12 : 6}
										style={{
											data: {
												cursor: "pointer",
												fill: (p) => colors[archetypeNames.indexOf(p.metadata.archetype_name)],
												stroke: "black",
												strokeWidth: 1.5,
											},
										}}
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
										labels={(p) => this.props.counts === "show" ? p.metadata.games : ""}
									/>
									<VictoryLegend
										data={legendData}
										orientation="horizontal"
										y={height - 80}
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
