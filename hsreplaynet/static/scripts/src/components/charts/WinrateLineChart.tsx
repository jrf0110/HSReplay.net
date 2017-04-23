import * as _ from "lodash";
import moment from "moment";
import * as React from "react";
import {
	VictoryArea, VictoryAxis, VictoryChart, VictoryLabel, VictoryVoronoiContainer,
} from "victory";
import {getChartMetaData, sliceZeros, toDynamicFixed, toTimeSeries} from "../../helpers";
import {RenderData} from "../../interfaces";
import ChartHighlighter from "./ChartHighlighter";
import WinLossGradient from "./gradients/WinLossGradient";

interface WinrateLineChartProps {
	data?: RenderData;
	title?: string;
	widthRatio?: number;
}

export default class WinrateLineChart extends React.Component<WinrateLineChartProps, any> {

	render(): JSX.Element {
		const width = 150 * (this.props.widthRatio || 3);
		const series = toTimeSeries(this.props.data.series.find((x) => x.name === "winrates_over_time") || this.props.data.series[0]);

		// This is a temporary solution to remove very low volume data points from the Un'Goro launch
		if (series.data[0].x === new Date("2017-04-05").getTime()) {
			const popularity = toTimeSeries(this.props.data.series.find((x) => x.name === "popularity_over_time") || this.props.data.series[0]);
			if (popularity.data[0].x === new Date("2017-04-05").getTime() && +popularity.data[0].y * 100 < +popularity.data[1].y) {
				series.data.shift();
			}
		}

		const metadata = getChartMetaData(series.data, 50, true, 10);

		const minAbove50 = metadata.yMinMax[0].y > 50;
		const maxBelow50 = metadata.yMinMax[1].y < 50;
		const isMinTick = (tick: number) => tick === metadata.yDomain[0];
		const isMaxTick = (tick: number) => tick === metadata.yDomain[1];

		const yTicks = [50];
		metadata.yDomain.forEach((value) => yTicks.indexOf(value) === -1 && yTicks.push(value));

		const filterId = _.uniqueId("winrate-by-time-gradient-");

		return (
			<svg viewBox={"0 0 " + width + " 150"}>
				<defs>
					<WinLossGradient id={filterId} metadata={metadata} />
				</defs>,
				<VictoryChart
					height={150}
					width={width}
					domainPadding={{x: 0, y: 10}}
					padding={{left: 40, top: 10, right: 20, bottom: 30}}
					domain={{x: metadata.xDomain, y: metadata.yDomain}}
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
						label={"Winrate"}
						axisLabelComponent={<VictoryLabel dy={-1} dx={20} />}
						tickValues={[50].concat(metadata.yDomain)}
						tickFormat={(tick) => {
							if (tick === 50) {
								return "50%";
							}
							if (minAbove50 && isMinTick(tick)) {
								return "";
							}
							if (maxBelow50 && isMaxTick(tick)) {
								return "";
							}
							return metadata.toFixed(tick) + "%";
						}}
						style={{
							axisLabel: {fontSize: 8},
							tickLabels: {fontSize: 8},
							grid: {stroke: (tick) => tick === 50 ? "gray" : (minAbove50 && isMinTick(tick) || maxBelow50 && isMaxTick(tick) ? "transparent" : "lightgray")},
							axis: {visibility: "hidden"},
						}}
					/>
					<VictoryArea
						data={series.data.map((p) => {return {x: p.x, y: p.y, _y0: 50}; })}
						style={{data: {fill: `url(#${filterId})`, stroke: "black", strokeWidth: 0.3}}}
						interpolation="monotoneX"
					/>
				</VictoryChart>
			</svg>
		);
	}
}
