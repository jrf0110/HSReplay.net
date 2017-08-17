import * as React from "react";
import CardData from "../CardData";
import TabList from "../components/layout/TabList";
import Tab from "../components/layout/Tab";
import {toTitleCase} from "../helpers";
import DataManager from "../DataManager";
import LoadingSpinner from "../components/LoadingSpinner";
import { VictoryAxis, VictoryChart, VictoryLegend, VictoryScatter, VictoryTheme, VictoryTooltip } from "victory";
import { AutoSizer } from "react-virtualized";
import CardList from "../components/CardList";
import DataInjector from "../components/DataInjector";

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
	games: number;
	archetype_name: string;
	pretty_decklist: string;
	url: string;
}

interface ArchetypeAnalysisState {
	data: ClassData;
	hovering?: ClusterMetaData;
	left?: boolean;
	tab?: string;
}

interface ArchetypeAnalysisProps extends React.ClassAttributes<ArchetypeAnalysis> {
	cardData: CardData;
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
			tab: "DRUID",
		};

		this.fetchData();
	}

	fetchData() {
		DataManager.get("/analytics/clustering/data/").then((data) => {
			const classData: ClassData = {};
			data.forEach((playerClassData) => {
				classData[playerClassData.player_class] = playerClassData.data;
			});
			this.setState({data: classData});
		});
	}

	render(): JSX.Element {
		return (
			<TabList tab={this.state.tab} setTab={(tab) => this.setState({tab})}>
				{this.renderClassTabs()}
			</TabList>
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
						const archetypeNames = [];
						data.forEach((d) => {
							if (archetypeNames.indexOf(d.metadata.archetype_name) === -1) {
								archetypeNames.push(d.metadata.archetype_name);
							}
						});
						archetypeNames.sort();
						const legendData = archetypeNames.map((name, index) => {
							return {name, symbol: {type: "circle"}, color: colors[index]};
						});
						const scatterSize = 5;
						const scatterStokeWidth = scatterSize / 3;
						const axisLabelSize = height / 100;
						return (
							<div style={{position: "absolute", width: "100%", height: "100%"}}>
								{this.renderCardList()}
								<VictoryChart theme={VictoryTheme.material} height={height} width={width} padding={30}>
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
															return null;
														},
													}];
												},
												onMouseLeave: () => {
													return [{
														mutation: (props) => {
															this.setState({hovering: null});
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
										y={height - 50}
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

	renderCardList(): JSX.Element {
		const {hovering, left} = this.state;
		if (hovering === null) {
			return null;
		}
		const deckId = hovering.url.split("/").pop();
		const style = {position: "absolute", width: "217px"};
		style[left ? "left" : "right"] = 0;
		return (
			<div style={style}>
				<p><strong>{hovering.archetype_name}</strong></p>
				<p>Games: {hovering.games}</p>
				<DataInjector
					query={{url: "/api/v1/decks/" + deckId, params: {}}}
					extract={{data: (data) => ({cardList: data.cards})}}
				>
					<CardList
						cardData={this.props.cardData}
						cardList={[]}
						name=""
						heroes={[]}
					/>
				</DataInjector>
			</div>
		);
	}
}
