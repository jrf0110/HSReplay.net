import * as React from "react";
import CardData from "../CardData";
import TabList from "../components/layout/TabList";
import Tab from "../components/layout/Tab";
import {toTitleCase} from "../helpers";
import DataManager from "../DataManager";
import LoadingSpinner from "../components/LoadingSpinner";
import { VictoryAxis, VictoryChart, VictoryLegend, VictoryScatter, VictoryTheme, VictoryTooltip, VictoryZoomContainer } from "victory";
import { AutoSizer } from "react-virtualized";
import CardList from "../components/CardList";
import DataInjector from "../components/DataInjector";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import InfoboxFilter from "../components/InfoboxFilter";

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
	pretty_decklist: string;
	url: string;
}

interface ArchetypeAnalysisState {
	data: ClassData;
	hovering?: ClusterMetaData;
	left?: boolean;
}

interface ArchetypeAnalysisProps extends React.ClassAttributes<ArchetypeAnalysis> {
	cardData: CardData;
	format?: string;
	tab?: string;
	setFormat?: (format: string) => void;
	setTab?: (tab: string) => void;
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
			data: null,
			hovering: null,
			left: false,
		};

		this.fetchData(props.format);
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
						const scatterSize = 6;
						const scatterStokeWidth = 1.5;
						const axisLabelSize = height / 100;
						return (
							<div style={{position: "absolute", width: "100%", height: "100%"}}>
								<VictoryChart
									theme={VictoryTheme.material}
									height={height}
									width={width}
									padding={30}
									domainPadding={30}
									containerComponent={
										<VictoryZoomContainer/>
									}
								>
									<VictoryAxis crossAxis={true} dependentAxis={true} style={{tickLabels: {fontSize: axisLabelSize}}}/>
									<VictoryAxis crossAxis={true} style={{tickLabels: {fontSize: axisLabelSize}}}/>
									<VictoryScatter
										data={this.state.data[playerClass]}
										size={scatterSize}
										style={{
											data: {
												cursor: "pointer",
												fill: (p) => colors[archetypeNames.indexOf(p.metadata.archetype_name)],
												stroke: "black",
												strokeWidth: scatterStokeWidth,
											},
										}}
										events={[{
											eventHandlers: {
												onClick: () => {
													return [{
														mutation: (props) => {
															window.open(props.datum.metadata.url, "_blank");
															return null;
														},
														target: "data",
													}];
												},
												onMouseEnter: (e) => {
													return [{
														mutation: (props) => {
															this.setState({hovering: props.datum.metadata, left: props.x > width / 2 });
															return {
																style: Object.assign({}, props.style, {strokeWidth: scatterStokeWidth * 2}),
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
									/>
									<VictoryLegend
										data={legendData}
										orientation="horizontal"
										y={height - 80}
										style={{
											data: {
												fill: (d) => d.color,
												size: scatterSize,
												stroke: "black",
												strokeWidth: scatterStokeWidth,
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
		const {hovering, left} = this.state;
		if (hovering === null) {
			return (
				<div className="message-wrapper">
					Hover any deck
				</div>
			);
		}
		const cardList = [];
		JSON.parse(hovering.deck_list).forEach((c: any[]) => {
			for (let i = 0; i < c[1]; i++) {
				cardList.push(c[0]);
			}
		});
		return [
			<ul>
				<li>
					Name
					<span className="infobox-value">{hovering.archetype_name}</span>
				</li>
				<li>
					Games
					<span className="infobox-value">{hovering.games}</span>
				</li>
				<li>
					Deck details
					<a href={hovering.url} className="infobox-value">open detail page</a>
				</li>
			</ul>,
			<CardList
				cardData={this.props.cardData}
				cardList={cardList}
				name=""
				heroes={[]}
			/>,
		];
	}
}
