import * as React from "react";
import {VictoryAxis, VictoryChart, VictoryScatter, VictoryZoomContainer} from "victory";
import PointWrapper from "./PointWrapper";
import {ClusterMetaData, DeckData} from "./ClassAnalysis";
import * as _ from "lodash";

interface Domain {
	x: [number, number];
	y: [number, number];
}

interface ClusterChartState {
	chartKey?: string;
	domain?: Domain;
	entireDomain?: Domain;
	groupedData?: DeckData[][];
	selected?: ClusterMetaData;
}

interface ClusterChartProps extends React.ClassAttributes<ClusterChart> {
	clusterIds: string[];
	colors: string[];
	data: DeckData[];
	height: number;
	maxGames: number;
	onPointClicked: (data) => void;
	playerClass: string;
	sampleSize: number;
	width: number;
	zoomEnabled: boolean;
}

const MIN_POINT_SIZE = 5;
const MAX_POINT_SIZE = 45;

export default class ClusterChart extends React.Component<ClusterChartProps, ClusterChartState> {
	constructor(props: ClusterChartProps, state: ClusterChartState) {
		super(props, state);
		const domain = this.getEntireDomain(props.data);
		this.state = {
			chartKey: _.uniqueId("chart"),
			domain,
			entireDomain: domain,
			groupedData: this.getGroupedData(props.data),
			selected: null,
		};
	}

	getEntireDomain(data: DeckData[]): Domain {
		const domain: Domain = {
			x: [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER],
			y: [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER],
		};
		data.forEach((d) => {
			if (d.x < domain.x[0]) {
				domain.x[0] = d.x;
			}
			if (d.x > domain.x[1]) {
				domain.x[1] = d.x;
			}
			if (d.y < domain.y[0]) {
				domain.y[0] = d.y;
			}
			if (d.y > domain.y[1]) {
				domain.y[1] = d.y;
			}
		});
		return domain;
	}

	getGroupedData(data: DeckData[]): DeckData[][] {
		const grouped = _.groupBy(data, (d) => d.metadata.cluster_id);
		return Object.keys(grouped).map((key) => grouped[key]);
	}

	componentWillUpdate(nextProps: ClusterChartProps) {
		if (nextProps.playerClass !== this.props.playerClass) {
			// the chartKey is used to reset the zoom domain
			// when the selected player class changes
			const domain = this.getEntireDomain(nextProps.data);
			this.setState({
				chartKey: _.uniqueId("chart"),
				domain,
				entireDomain: domain,
				groupedData: this.getGroupedData(nextProps.data),
			});
		}
	}

	downSample(data: DeckData[][], size: number): DeckData[] {
		const sampled = [];
		let i = 0;
		while (sampled.length < size) {
			let done = true;
			for (const e of data) {
				if (e.length > i) {
					done = false;
					sampled.push(e[i]);
				}
			}
			if (done) {
				break;
			}
			i++;
		}
		return sampled.slice(0, size);
	}

	getDomainData(): DeckData[][] {
		const {domain, groupedData} = this.state;
		return groupedData.map((group) => {
			const data = group.filter((d) => {
				return d.x < domain.x[1] && d.x > domain.x[0] && d.y < domain.y[1] && d.y > domain.y[0];
			});
			data.sort((a, b) => b.metadata.games - a.metadata.games);
			return data;
		});
	}

	render(): JSX.Element {
		const {clusterIds, data, playerClass, sampleSize, width, height, zoomEnabled} = this.props;
		const {domain} = this.state;
		const axisLabelSize = height / 100;
		const filtered = this.getDomainData();
		const numDecksInDomain = _.sumBy(filtered, (x) => x.length);
		const sampled = zoomEnabled ? this.downSample(filtered, sampleSize) : data;
		let sampleHint = null;
		if (zoomEnabled && numDecksInDomain > sampleSize) {
			sampleHint = (
				<span className="sample-hint">
					To improve performance, {numDecksInDomain - sampleSize} decks have been hidden. Zoom in to show more.
				</span>
			);
		}
		return (
			<div className="cluster-chart-wrapper" key="chart">
				{sampleHint}
				<VictoryChart
					key={this.state.chartKey}
					domain={this.state.entireDomain}
					height={height}
					width={width}
					padding={10}
					domainPadding={30}
					containerComponent={
						<VictoryZoomContainer
							allowZoom={zoomEnabled}
							onDomainChange={(newDomain) => {
								this.setState({domain: newDomain});
							}}
						/>
					}
				>
					<VictoryAxis
						crossAxis={true}
						dependentAxis={true}
						style={{axis: {display: "none"}, tickLabels: {display: "none"}}}
					/>
					<VictoryAxis
						crossAxis={true}
						style={{axis: {display: "none"}, tickLabels: {display: "none"}}}
					/>
					<VictoryScatter
						dataComponent={<PointWrapper selectedDatum={this.state.selected}/>}
						data={sampled}
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
