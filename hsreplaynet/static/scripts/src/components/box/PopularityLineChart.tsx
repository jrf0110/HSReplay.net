import * as _ from "lodash";
import * as React from "react";
import {
	VictoryArea, VictoryAxis, VictoryChart,
} from "victory";
import {getChartMetaData, toTimeSeries} from "../../helpers";
import {RenderData} from "../../interfaces";

interface PopularityLineChartProps {
	data?: RenderData;
	height: number;
	width: number;
}

export default class PopularityLineChart extends React.Component<PopularityLineChartProps, any> {

	render(): JSX.Element {
		const series = toTimeSeries(this.props.data.series.find((x) => x.name === "popularity_over_time") || this.props.data.series[0]);

		const metadata = getChartMetaData(series.data, undefined, true, 1);
		metadata.yDomain = [0, Math.max(10, metadata.yDomain[1])];

		const filterId = _.uniqueId("popularity-gradient-");

		return (
			<svg viewBox={`0 0 ${this.props.width} ${this.props.height}`} style={{position: "absolute"}}>
				<defs>
					<linearGradient id={filterId} x1="50%" y1="100%" x2="50%" y2="0%">
						<stop stopColor="rgba(255, 255, 255, 0)" offset={0}/>
						<stop stopColor="rgba(0, 128, 255, 0.6)" offset={1}/>
					</linearGradient>
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
						scale="sqrt"
						tickFormat={(tick) => ""}
						style={{axis: {visibility: "hidden"}, grid: {stroke: "transparent"}}}
					/>
					<VictoryArea
						data={series.data.map((p) => {return {x: p.x, y: p.y, _y0: metadata.yDomain[0]}; })}
						style={{data: {fill: `url(#${filterId})`, stroke: "black", strokeWidth: 1}}}
						interpolation="monotoneX"
					/>
				</VictoryChart>
			</svg>
		);
	}
}
