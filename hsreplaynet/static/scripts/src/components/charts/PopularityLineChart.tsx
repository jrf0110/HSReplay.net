import * as React from "react";
import {
	VictoryAxis, VictoryChart, VictoryContainer, VictoryLabel, VictoryLine,
	VictoryScatter, VictoryVoronoiTooltip, VictoryTooltip
} from "victory";
import {RenderData} from "../../interfaces";
import {getChartMetaData, toTimeSeries} from "../../helpers";
import PopularityGradient from "./gradients/PopularityGradient";
import moment from "moment";

interface CardDetailLineChartProps extends React.ClassAttributes<CardDetailLineChart>{
	renderData: RenderData;
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
		let timespan = null;

		if(this.props.renderData === "loading") {
			content = <VictoryLabel text={"Loading..."} style={{fontSize: 14}} textAnchor="middle" verticalAnchor="middle" x={width/2} y={75}/>
		}
		else if (this.props.renderData === "error") {
			content = <VictoryLabel text={"Please check back later"} style={{fontSize: 14}} textAnchor="middle" verticalAnchor="middle" x={width/2} y={75}/>
		}
		else if (this.props.renderData) {
			const series = toTimeSeries(this.props.renderData.series[0]);
			const metadata = getChartMetaData(series.data, undefined, true);

			timespan = "last " + moment.duration((+metadata.xMinMax[1].x - +metadata.xMinMax[0].x)/1000, "seconds").humanize();

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
					domain={{x: metadata.xDomain, y: metadata.yDomain}}
					padding={{left: 55, top: 30, right: 20, bottom: 30}}
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
						tickFormat={tick => metadata.toFixed(tick) + "%"}
						style={{axisLabel: {fontSize: 8} ,tickLabels: {fontSize: 8}, grid: {stroke: d => d === metadata.yCenter ? "gray" : "lightgray"}, axis: {visibility: "hidden"}}}
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
		return (
			<svg viewBox={"0 0 " + width + " 150"}>
				{content}
				<VictoryLabel text={"Popularity" + (timespan ? " - " + timespan : "")} style={{fontSize: 10}} textAnchor="start" verticalAnchor="start" x={0} y={10}/>
			</svg>
		);
	}
}
