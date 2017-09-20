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
	ccp_signatures: {[id: number]: Array<[number, number]>};
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
}

interface ClassAnalysisState {
	selectedDeck?: ClusterMetaData;
}

interface ClassAnalysisProps extends React.ClassAttributes<ClassAnalysis> {
	cardData: CardData;
	data?: ClusterData;
	format: string;
	maxGames?: number;
	onSelectedDeckChanged?: (data: ClusterMetaData) => void;
	playerClass: string;
	clusterTab: string;
	setClusterTab: (clusterTab: string) => void;
	sampleSize: number;
	canModifyArchetype: boolean;
}

const COLORS = [
	"#3366CC", "#DC3912", "#FF9900", "#109618", "#990099",
	"#00BBC6", "#FD4477", "#85AA00", "#3123D5", "#994499", "#AAAA11",
	"#6633CC", "#E67300", "#8B0707", "#A29262", "#BAB4B6",
];

class ClassAnalysis extends React.Component<ClassAnalysisProps, ClassAnalysisState> {
	constructor(props: ClassAnalysisProps, state: ClassAnalysisState) {
		super(props, state);
		this.state = {
			selectedDeck: null,
		};
	}

	componentWillReceiveProps(nextProps: ClassAnalysisProps) {
		if (nextProps.playerClass !== this.props.playerClass) {
			this.setState({selectedDeck: null});
			this.props.setClusterTab("decks");
		}
	}

	render(): JSX.Element {
		const {data, maxGames, playerClass, sampleSize} = this.props;
		const {selectedDeck} = this.state;
		const clusterIds = Object.keys(data.cluster_map).sort();
		const chartHeight = "calc(100vh - 125px)";
		return (
			<TabList
				setTab={this.props.setClusterTab}
				tab={this.props.clusterTab}
			>
				<Tab id="decks" label={this.renderChartTabLabel()} highlight={true}>
					<div className="class-tab-content">
						<div className="cluster-chart-container" style={{height: chartHeight}}>
							<AutoSizer>
								{({height, width}) => {
									return (
										<ClusterChart
											colors={this.getColors()}
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
											sampleSize={sampleSize}
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
				{toTitleCase(playerClass)} Decks
			</span>
		);
	}

	renderSignatureTabs(): JSX.Element[] {
		const {canModifyArchetype, data, format, playerClass} = this.props;
		const clusterIds = Object.keys(data.cluster_map).sort();
		return clusterIds.map((clusterId) => {
			const color = this.getClusterColor(clusterId, clusterIds);
			return (
				<Tab
					key={clusterId}
					id={this.clusterTabId(clusterId)}
					label={
						<ClusterTabLabel
							active={this.clusterTabId(clusterId) === this.props.clusterTab}
							clusterId={clusterId}
							clusterName={data.cluster_names[clusterId]}
							color={color}
							format={format}
							playerClass={playerClass}
							canModifyArchetype={canModifyArchetype}
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
		return clusterId;
	}

	getClusterColor(clusterId: string, clusterIds: string[]): string {
		return this.getColors()[clusterIds.indexOf(clusterId)];
	}

	getColors(): string[] {
		const colors = COLORS.slice();
		if (this.props.data.data.some((x) => x.metadata.cluster_id === -1)) {
			colors.unshift("#666666");
		}
		return colors;
	}
}

export default withLoading()(ClassAnalysis);
