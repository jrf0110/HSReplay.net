import * as _ from "lodash";
import moment from "moment";
import * as React from "react";
import {
	VictoryArea, VictoryAxis, VictoryChart, VictoryLabel,
} from "victory";
import {VictoryVoronoiContainer} from "victory";
import {getChartMetaData, sliceZeros, toDynamicFixed, toTimeSeries} from "../../helpers";
import {RenderData} from "../../interfaces";
import ChartHighlighter from "./ChartHighlighter";

interface PopularityLineChartProps{
	data?: RenderData;
	maxYDomain: 10 | 100;
	widthRatio?: number;
}

export default class PopularityLineChart extends React.Component<PopularityLineChartProps, any> {
	private readonly colorMin = "rgba(0, 196, 255, 1.0)";
	private readonly colorMax = "rgba(255, 128, 0, 1.0)";

	render(): JSX.Element {
		const width = 150 * (this.props.widthRatio || 3);

		const series = toTimeSeries(this.props.data.series.find((x) => x.name === "popularity_over_time") || this.props.data.series[0]);

		// This is a temporary solution to remove very low volume data points from the Un'Goro launch
		if (series.data[0].x === new Date("2017-04-05").getTime() && +series.data[0].y * 100 < +series.data[1].y) {
			series.data.shift();
		}

		const metadata = getChartMetaData(series.data, undefined, true, 1);
		metadata.yDomain = [0, Math.max(this.props.maxYDomain, metadata.yDomain[1])];

		const filterId = _.uniqueId("popularity-gradient-");

		return (
			<svg viewBox={"0 0 " + width + " 150"}>
				<defs>
					<linearGradient id={filterId} x1="50%" y1="100%" x2="50%" y2="0%">
						<stop stopColor="rgba(255, 255, 255, 0)" offset={0}/>
						<stop stopColor="rgba(0, 128, 255, 0.6)" offset={1}/>
					</linearGradient>
				</defs>
				<VictoryChart
					height={150}
					width={width}
					domainPadding={{x: 0, y: 10}}
					domain={{x: metadata.xDomain, y: metadata.yDomain}}
					padding={{left: 40, top: 10, right: 20, bottom: 30}}
					containerComponent={<VictoryVoronoiContainer
						dimension="x"
						labels={(d) => moment(d.x).format("YYYY-MM-DD") + ": " + sliceZeros(toDynamicFixed(d.y, 2)) + "%"}
						labelComponent={<ChartHighlighter xCenter={metadata.xCenter} />}
					/>}
				>
					<VictoryAxis
						scale="time"
						tickValues={metadata.seasonTicks}
						tickFormat={(tick) => moment(tick).add(1, "day").format("MMMM")}
						style={{axisLabel: {fontSize: 8}, tickLabels: {fontSize: 8}, grid: {stroke: "gray"}, axis: {visibility: "hidden"}}}
					/>
					<VictoryAxis
						dependentAxis
						scale="sqrt"
						label={"Popularity"}
						axisLabelComponent={<VictoryLabel dy={-1} dx={20} />}
						tickValues={this.props.maxYDomain === 10 ? [0, 0.5, 2, 5, 10] : [0, 5, 20, 50, 100]}
						tickFormat={(tick) => metadata.toFixed(tick) + "%"}
						style={{axisLabel: {fontSize: 8} , tickLabels: {fontSize: 8}, grid: {stroke: (d) => d === metadata.yCenter ? "gray" : "lightgray"}, axis: {visibility: "hidden"}}}
					/>
					<VictoryArea
						data={series.data.map((p) => {return {x: p.x, y: p.y, _y0: metadata.yDomain[0]}; })}
						style={{data: {fill: `url(#${filterId})`, stroke: "black", strokeWidth: 0.3}}}
						interpolation="monotoneX"
					/>
				</VictoryChart>
			</svg>
		);
	}
}
