import * as React from "react";
import {
	VictoryAxis, VictoryChart, VictoryContainer, VictoryLabel, VictoryLine,
	VictoryScatter, VictoryVoronoiTooltip, VictoryTooltip
} from "victory";
import {ChartSeries} from "../../interfaces";
import {getChartMetaData, toTimeSeries} from "../../helpers";
import PopularityGradient from "./gradients/PopularityGradient";
import moment from "moment";

interface CardDetailLineChartProps {
	series: ChartSeries;
	widthRatio?: number;
}

export default class CardDetailLineChart extends React.Component<CardDetailLineChartProps, any> {
	private readonly colorMin = "rgba(0, 196, 255, 1.0)";
	private readonly colorMax = "rgba(255, 128, 0, 1.0)";

	constructor(props: CardDetailLineChartProps, state: any) { super(props, state);
		this.state = {
			cursorPos: null,
		}
	}

	render(): JSX.Element {
		const width = 150 * (this.props.widthRatio || 3);

		let content = null;

		//TODO: use this.props.series instead of this.mockSeries
		if (this.mockSeries) {
			const series = toTimeSeries(this.mockSeries);
			const metadata = getChartMetaData(series.data, undefined, true);

			const tooltip = <VictoryTooltip
				cornerRadius={0}
				pointerLength={0}
				padding={1}
				dx={d => d.x > metadata.xCenter ? -40 : 40}
				dy={-12}
				flyoutStyle={{
					stroke: "gray",
					fill: "rgba(255, 255, 255, 0.85)"
				}}
			/>;

			content = [
				<defs>
					<PopularityGradient id="popularity-gradient" colorMin={this.colorMin} colorMax={this.colorMax} />
				</defs>,
				<VictoryChart
					height={150}
					width={width}
					containerComponent={<VictoryContainer title={""}/>}
					domainPadding={{x: 10, y: 10}}
					padding={{left: 50, top: 30, right: 20, bottom: 30}}
					>
					<VictoryAxis
						scale="time"
						tickValues={metadata.seasonTicks}
						tickFormat={tick => tick === metadata.seasonTicks[0] ? "Last season" : "This season"}
						style={{axisLabel: {fontSize: 8}, tickLabels: {fontSize: 8}, grid: {stroke: "gray"}, axis: {visibility: "hidden"}}}
					/>
					<VictoryAxis
						dependentAxis
						axisLabelComponent={<VictoryLabel dx={10} />}
						tickValues={[metadata.yCenter].concat(metadata.yDomain)}
						tickFormat={tick => "Rank " + tick}
						style={{axisLabel: {fontSize: 8} ,tickLabels: {fontSize: 8}, grid: {stroke: d => d === metadata.yCenter ? "gray" : "transparent"}, axis: {visibility: "hidden"}}}
					/>
					<VictoryLine
						data={series.data}
						interpolation="basis"
						style={{data: {stroke: "url(#popularity-gradient)", strokeWidth: 3}}}
					/>
					<VictoryScatter
						data={[metadata.xMinMax[0], metadata.xMinMax[1]]}
						style={{data: {fill: d => d.x == metadata.xMinMax[0].x ? this.colorMin : this.colorMax}}}
					/>
					<VictoryVoronoiTooltip
						data={series.data}
						labels={d => moment(d.x).format("YYYY-MM-DD") + "\n" + d.y + "%"}
						labelComponent={tooltip}
						style={{
							labels: {fontSize: 6, padding: 5}
						}}
					/>
				</VictoryChart>
			];	
		}
		else {
			content = <VictoryLabel text={"Loading..."} style={{fontSize: 14}} textAnchor="middle" verticalAnchor="middle" x={width/2} y={75}/>
		}
		return (
			<svg viewBox={"0 0 " + width + " 150"}>
				{content}
				<VictoryLabel text={"Popularity - last 2 months"} style={{fontSize: 10}} textAnchor="start" verticalAnchor="start" x={0} y={10}/>
			</svg>
		);
	}

	readonly mockSeries = {
		data: [
			{x: "2016-12-25", y: 217},
			{x: "2016-12-28", y: 217},
			{x: "2016-12-29", y: 225},
			{x: "2016-12-30", y: 211},
			{x: "2016-12-31", y: 217},
			{x: "2017-01-20", y: 225},
			{x: "2017-01-21", y: 217},
			{x: "2017-01-22", y: 217},
			{x: "2017-01-23", y: 217},
			{x: "2017-01-24", y: 217},
			{x: "2017-01-25", y: 217},
			{x: "2017-01-26", y: 211},
			{x: "2017-01-27", y: 199},
			{x: "2017-01-28", y: 211},
			{x: "2017-01-29", y: 225},
			{x: "2017-01-30", y: 231},
			{x: "2017-01-31", y: 225},
			{x: "2017-02-01", y: 217},
			{x: "2017-02-02", y: 225},
			{x: "2017-02-03", y: 231},
			{x: "2017-02-04", y: 241},
			{x: "2017-02-05", y: 249},
			{x: "2017-02-06", y: 241},
		],
		name: "foo",
		metadata: {}
	}
}
