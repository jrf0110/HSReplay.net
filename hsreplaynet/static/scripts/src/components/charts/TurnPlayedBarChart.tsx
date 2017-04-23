import * as _ from "lodash";
import * as React from "react";
import {
	VictoryArea, VictoryAxis, VictoryChart, VictoryContainer, VictoryLabel, VictoryScatter,
} from "victory";
import {RenderData} from "../../interfaces";
import {getChartMetaData} from "../../helpers";
import {VictoryVoronoiContainer} from "victory";
import ChartHighlighter from "./ChartHighlighter";

interface TurnPlayedBarChartProps {
	data?: RenderData;
	opponentClass?: string;
	widthRatio?: number;
	premiumLocked?: boolean;
}

export default class TurnPlayedBarChart extends React.Component<TurnPlayedBarChartProps, any> {
	render(): JSX.Element {
		const width = 150 * (this.props.widthRatio || 3);

		const renderData = this.props.premiumLocked ? this.mockData : this.props.data;
		const series = renderData.series.find((s) => s.name === "popularity_by_turn"
			&& (this.props.opponentClass === "ALL" || s.metadata["opponent_class"] === this.props.opponentClass));
		const metaData = getChartMetaData(series.data, undefined, false, 10);

		const filterId = _.uniqueId("turn-played-gradient-");
		const blurId = _.uniqueId("popularity-gaussian-blur-");

		return (
			<svg viewBox={"0 0 " + width + " 150"}>
				<defs>
					<linearGradient id={filterId} x1="50%" y1="100%" x2="50%" y2="0%">
						<stop stopColor="rgba(255, 255, 255, 0)" offset={0}/>
						<stop stopColor="rgba(0, 128, 255, 0.6)" offset={1}/>
					</linearGradient>
					<filter id={blurId}>
						<feGaussianBlur in="SourceGraphic" stdDeviation="2" />
					</filter>
				</defs>
				<svg filter={this.props.premiumLocked && `url(#${blurId})`}>
					<VictoryChart
						height={150}
						width={width}
						containerComponent={<VictoryContainer title={""}/>}
						domainPadding={[5, 5]}
						domain={{x: metaData.xDomain, y: [0, metaData.yDomain[1]]}}
						padding={{left: 40, top: 10, right: 20, bottom: 40}}
						>
						<VictoryAxis
							label="Turn"
							tickCount={series.data.length}
							tickFormat={(tick) => tick}
							style={{
								axisLabel: {fontSize: 8},
								tickLabels: {fontSize: 8},
								grid: {stroke: "lightgray"},
								axis: {visibility: "hidden"},
							}}
						/>
						<VictoryAxis
							dependentAxis
							label={"Popularity"}
							axisLabelComponent={<VictoryLabel dy={-1} dx={30} />}
							tickValues={[0, metaData.yCenter, metaData.yDomain[1]]}
							tickFormat={(tick) => Math.round(+tick) + " %"}
							style={{
								axisLabel: {fontSize: 8},
								tickLabels: {fontSize: 8},
								grid: {stroke: (d) => d === metaData.yCenter ? "gray" : "lightgray"},
								axis: {visibility: "hidden"},
							}}
						/>
						<VictoryScatter
							data={series.data}
							size={1}
						/>
						<VictoryArea
							data={series.data.map((p) => {return {x: p.x, y: p.y, _y0: 0};})}
							style={{data: {fill: `url(#${filterId})`, stroke: "black", strokeWidth: 0.3}}}
							interpolation="monotoneX"
							containerComponent={<VictoryVoronoiContainer
								dimension="x"
								labels={(d) => "Turn " + d.x + "\n" + d.y + "%"}
								labelComponent={<ChartHighlighter xCenter={metaData.xCenter} />}
							/>}
						/>
					</VictoryChart>
				</svg>
			</svg>
		);
	}

	readonly mockData: RenderData = {
		series: [{
			name: "popularity_by_turn",
			data: [
				{y: 51, x: 1},
				{y: 9, x: 2},
				{y: 51, x: 3},
				{y: 9, x: 4},
				{y: 51, x: 5},
				{y: 9, x: 6},
				{y: 51, x: 7},
				{y: 9, x: 8},
				{y: 51, x: 9},
				{y: 9, x: 10},
			],
		}],
	};
}
