import * as _ from "lodash";
import * as React from "react";
import {
	VictoryArea, VictoryAxis, VictoryChart,
} from "victory";
import {getChartMetaData, toTimeSeries} from "../../helpers";
import {RenderData} from "../../interfaces";
import WinLossGradient from "../charts/gradients/WinLossGradient";

interface WinrateLineChartProps {
	data?: RenderData;
	height: number;
	width: number;
}

export default class WinrateLineChart extends React.Component<WinrateLineChartProps, any> {

	render(): JSX.Element {
		const series = toTimeSeries(this.props.data.series.find((x) => x.name === "winrates_over_time") || this.props.data.series[0]);
		const metadata = getChartMetaData(series.data, 50, true, 10);

		const yTicks = [50];
		metadata.yDomain.forEach((value) => yTicks.indexOf(value) === -1 && yTicks.push(value));

		const filterId = _.uniqueId("winrate-by-time-gradient-");

		return (
			<svg viewBox={`0 0 ${this.props.width} ${this.props.height}`} style={{position: "absolute"}}>
				<defs>
					<WinLossGradient id={filterId} metadata={metadata} />
				</defs>,
				<VictoryChart
					height={this.props.height}
					width={this.props.width}
					padding={{left: 0, top: 3, right: 0, bottom: 3}}
					domain={{x: metadata.xDomain, y: metadata.yDomain}}
				>
					<VictoryAxis
						scale="time"
						tickFormat={(tick) => ""}
						style={{grid: {stroke: "transparent"}, axis: {visibility: "hidden"}}}
					/>
					<VictoryAxis
						dependentAxis
						tickFormat={(tick) => ""}
						style={{axis: {visibility: "hidden"}, grid: {stroke: "transparent"}}}
					/>
					<VictoryArea
						data={series.data.map((p) => {return {x: p.x, y: p.y, _y0: 50}; })}
						style={{data: {fill: `url(#${filterId})`, stroke: "black", strokeWidth: 1}}}
						interpolation="monotoneX"
					/>
				</VictoryChart>
			</svg>
		);
	}
}
