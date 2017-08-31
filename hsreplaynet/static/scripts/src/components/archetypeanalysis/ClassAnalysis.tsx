import * as React from "react";
import CardData from "../../CardData";
import ClusterChart from "./ClusterChart";
import ClusterDetail from "./ClusterDetail";
import ClusterTabLabel from "./ClusterTabLabel";
import DeckInfo from "./DeckInfo";
import Tab from "../layout/Tab";
import TabList from "../layout/TabList";
import { withLoading } from "../loading/Loading";
import {AutoSizer} from "react-virtualized";
import {toTitleCase} from "../../helpers";

export interface ClusterData {
	cluster_map: {[clusterId: number]: number};
	cluster_names: {[clusterId: number]: string};
	data: DeckData[];
	player_class: string;
	signatures: {[id: number]: Array<[number, number]>};
}

export interface DeckData {
	metadata: ClusterMetaData;
	x: number;
	y: number;
}

export interface ClusterMetaData {
	cluster_id: number;
	cluster_name: string;
	deck_list: string;
	games: number;
	shortid: string;
	win_rate: number;
}

interface ClassAnalysisState {
	selectedDeck?: ClusterMetaData;
	activeClusterTab?: string;
}

interface ClassAnalysisProps extends React.ClassAttributes<ClassAnalysis> {
	cardData: CardData;
	format: string;
	playerClass: string;
	data?: ClusterData;
	onSelectedDeckChanged?: (data: ClusterMetaData) => void;
}

const COLORS = [
	"#666666", "#3366CC", "#DC3912", "#FF9900", "#109618", "#990099",
	"#00BBC6", "#FD4477", "#85AA00", "#3123D5", "#994499", "#AAAA11",
	"#6633CC", "#E67300", "#8B0707", "#A29262", "#BAB4B6",
];

class ClassAnalysis extends React.Component<ClassAnalysisProps, ClassAnalysisState> {
	constructor(props: ClassAnalysisProps, state: ClassAnalysisState) {
		super(props, state);
		this.state = {
			activeClusterTab: null,
			selectedDeck: null,
		};
	}

	componentWillReceiveProps(nextProps: ClassAnalysisProps) {
		if (nextProps.playerClass !== this.props.playerClass) {
			this.setState({activeClusterTab: null, selectedDeck: null});
		}
	}

	render(): JSX.Element {
		const {data, playerClass} = this.props;
		const {selectedDeck} = this.state;

		let maxGames = 0;
		const clusterIds = Object.keys(data.cluster_map).sort();
		data.data.forEach((d) => {
			if (d.metadata.games > maxGames) {
				maxGames = d.metadata.games;
			}
		});
		const chartHeight = "calc(100vh - 100px)";
		return (
			<TabList
				setTab={(tab) => this.setState({activeClusterTab: tab})}
				tab={this.state.activeClusterTab}
			>
				<Tab id="chart" label={this.renderChartTabLabel()}>
					<div style={{display: "flex"}}>
						<div style={{width: "100%", height: chartHeight}}>
							<AutoSizer>
								{({height, width}) => {
									return (
										<ClusterChart
											colors={COLORS}
											height={height}
											width={width}
											data={data.data}
											clusterIds={clusterIds}
											maxGames={maxGames}
											playerClass={playerClass}
											onPointClicked={(deck) => {
												this.setState({selectedDeck: deck});
												if (this.props.onSelectedDeckChanged) {
													this.props.onSelectedDeckChanged(deck);
												}
											}}
										/>
									);
								}}
							</AutoSizer>
						</div>
						<DeckInfo
							cardData={this.props.cardData}
							clusterColor={
								selectedDeck && this.getClusterColor("" + selectedDeck.cluster_id, clusterIds)
							}
							deck={selectedDeck}
							format={this.props.format}
							height={chartHeight}
							playerClass={this.props.playerClass}
						/>
					</div>
				</Tab>
				{this.renderSignatureTabs()}
			</TabList>
		);
	}

	renderChartTabLabel(): JSX.Element {
		const {playerClass} = this.props;
		return (
			<span className={"player-class " + playerClass.toLowerCase()}>
				{toTitleCase(playerClass)} Chart
			</span>
		);
	}

	renderSignatureTabs(): JSX.Element[] {
		const {data, playerClass} = this.props;
		const clusterIds = Object.keys(data.cluster_map).sort();
		return clusterIds.map((clusterId) => {
			const color = this.getClusterColor(clusterId, clusterIds);
			return (
				<Tab
					key={clusterId}
					id={this.clusterTabId(clusterId)}
					label={
						<ClusterTabLabel
							active={this.clusterTabId(clusterId) === this.state.activeClusterTab}
							clusterId={clusterId}
							clusterName={data.cluster_names[clusterId]}
							color={color}
							playerClass={playerClass}
						/>
					}
				>
					<ClusterDetail
						cardData={this.props.cardData}
						clusterId={clusterId}
						data={data}
						key={clusterId}
					/>
				</Tab>
			);
		});
	}

	clusterTabId(clusterId: string): string {
		return "cluster-" + clusterId;
	}

	getClusterColor(clusterId: string, clusterIds: string[]): string {
		return COLORS[clusterIds.indexOf(clusterId)];
	}
}

export default withLoading()(ClassAnalysis);