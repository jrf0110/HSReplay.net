import * as React from "react";
import {VictoryAxis, VictoryChart, VictoryScatter, VictoryZoomContainer} from "victory";
import PointWrapper from "./PointWrapper";
import { ClusterMetaData, DeckData } from "./ClassAnalysis";
import * as _ from "lodash";

interface ClusterChartState {
	canZoom?: boolean;
	chartKey?: string;
	regenerateChartKey?: boolean;
	selected?: ClusterMetaData;
}

interface ClusterChartProps extends React.ClassAttributes<ClusterChart> {
	clusterIds: string[];
	colors: string[];
	data: DeckData[];
	width: number;
	height: number;
	maxGames: number;
	playerClass: string;
	onPointClicked: (data) => void;
}

const MIN_POINT_SIZE = 5;
const MAX_POINT_SIZE = 45;

export default class ClusterChart extends React.Component<ClusterChartProps, ClusterChartState> {
	constructor(props: ClusterChartProps, state: ClusterChartState) {
		super(props, state);
		this.state = {
			canZoom: false,
			chartKey: _.uniqueId("chart"),
			regenerateChartKey: false,
			selected: null,
		};
	}

	componentWillUpdate(nextProps: ClusterChartProps) {
		if (nextProps.playerClass !== this.props.playerClass && this.state.regenerateChartKey) {
			// this is done in order to reset the zoom domain
			// when the selected player class changes
			this.setState({chartKey: _.uniqueId("chart"), regenerateChartKey: false});
		}
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
		if (event.key === "Shift" && !this.state.canZoom) {
			this.setState({canZoom: true});
		}
	}

	handleKeyUp = (event) => {
		if (event.key === "Shift" && this.state.canZoom) {
			this.setState({canZoom: false});
		}
	}

	render(): JSX.Element {
		const {clusterIds, data, playerClass, width, height} = this.props;
		const axisLabelSize = height / 100;
		return (
			<div className="cluster-chart-wrapper" key="chart">
				<span className="zoom-hint">
					Hold <kbd>Shift</kbd> to unlock zoom
				</span>
				<VictoryChart
					key={this.state.chartKey}
					height={height}
					width={width}
					padding={10}
					domainPadding={30}
					containerComponent={
						<VictoryZoomContainer
							allowZoom={this.state.canZoom}
							onDomainChange={() => {
								if (!this.state.regenerateChartKey) {
									this.setState({regenerateChartKey: true});
								}
							}}
						/>
					}
				>
					<VictoryAxis crossAxis={true} dependentAxis={true} style={{tickLabels: {fontSize: axisLabelSize}}}/>
					<VictoryAxis crossAxis={true} style={{tickLabels: {fontSize: axisLabelSize}}}/>
					<VictoryScatter
						dataComponent={<PointWrapper selectedDatum={this.state.selected}/>}
						data={data}
						size={this.pointSize}
						style={this.scatterStyle()}
						symbol={(p) => p.metadata.cluster_id === -1 ? "diamond" : "circle"}
						events={this.eventHandlers()}
					/>
				</VictoryChart>
			</div>
		);
	}

	pointSize = (p) => {
		const value = p.metadata.games / this.props.maxGames;
		return ((1 - Math.exp(-value)) * (MAX_POINT_SIZE - MIN_POINT_SIZE) + MIN_POINT_SIZE);
	}

	scatterStyle(): any {
		const {colors, clusterIds} = this.props;
		return {
			data: {
				cursor: "pointer",
				fill: (p) => colors[clusterIds.indexOf("" + p.metadata.cluster_id)] || "gray",
				stroke: "black",
				strokeWidth: 1,
			},
		};
	}

	eventHandlers(): any[] {
		return [{
			eventHandlers: {
				onClick: () => {
					return [{
						mutation: (props) => {
							this.setState({selected: props.datum.metadata});
							this.props.onPointClicked(props.datum.metadata);
						},
						target: "data",
					}];
				},
			},
			target: "data",
		}];
	}
}
