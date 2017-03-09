import * as React from "react";
import {
	VictoryAxis, VictoryArea, VictoryChart, VictoryContainer, VictoryLabel,
	VictoryLine, VictoryVoronoiTooltip, VictoryTooltip, VictoryScatter
} from "victory";
import {RenderData, RenderQueryData} from "../../interfaces";
import {getChartMetaData} from "../../helpers";

interface TurnPlayedBarChartProps {
	renderData: RenderData;
	opponentClass?: string;
	widthRatio?: number;
	premiumLocked: boolean;
}

export default class TurnPlayedBarChart extends React.Component<TurnPlayedBarChartProps, any> {
	render(): JSX.Element {
		const width = 150 * (this.props.widthRatio || 3);
		const renderData = this.props.premiumLocked ? this.mockData : this.props.renderData;
		let content = null;

		if (renderData === "loading") {
			content = <VictoryLabel text={"Loading..."} style={{fontSize: 14}} textAnchor="middle" verticalAnchor="middle" x={width/2} y={75}/>
		}
		else if (renderData === "error") {
			content = <VictoryLabel text={"Please check back later"} style={{fontSize: 14}} textAnchor="middle" verticalAnchor="middle" x={width/2} y={75}/>
		}
		else if (renderData) {
			const series = renderData.series.find(s => s.name === "popularity_by_turn" 
				&& (this.props.opponentClass === "ALL" || s.metadata["opponent_class"] === this.props.opponentClass));

			const metaData = getChartMetaData(series.data, undefined, false, 10);

			const tooltip = <VictoryTooltip
				cornerRadius={0}
				pointerLength={0}
				padding={1}
				dx={d => d.x > metaData.xCenter ? -40 : 40}
				dy={-12}
				flyoutStyle={{
					stroke: "gray",
					fill: "rgba(255, 255, 255, 0.85)"
				}}
			/>;

			content = [
				<defs>
					<linearGradient id="turn-played-gradient" x1="50%" y1="100%" x2="50%" y2="0%">
						<stop stopColor="rgba(255, 255, 255, 0)" offset={0}/>
						<stop stopColor="rgba(0, 128, 255, 0.6)" offset={1}/>
					</linearGradient>
					<filter id="popularity-gaussian-blur">
						<feGaussianBlur in="SourceGraphic" stdDeviation="2" />
					</filter>
				</defs>,
				<svg filter={this.props.premiumLocked && "url(#popularity-gaussian-blur)"}>
					<VictoryChart
						height={150}
						width={width}
						containerComponent={<VictoryContainer title={""}/>}
						domainPadding={[5, 5]}
						domain={{x: metaData.xDomain, y: [0, metaData.yDomain[1]]}}
						padding={{left: 40, top: 30, right: 20, bottom: 30}}
						>
						<VictoryAxis
							tickCount={series.data.length}
							tickFormat={tick => tick}
							style={{
								axisLabel: {fontSize: 8},
								tickLabels: {fontSize: 8},
								grid: {stroke: "lightgray"},
								axis: {visibility: "hidden"}
							}}
						/>
						<VictoryAxis
							dependentAxis
							axisLabelComponent={<VictoryLabel dx={10} />}
							tickValues={[0, metaData.yCenter, metaData.yDomain[1]]}
							tickFormat={tick => Math.round(+tick) + " %"}
							style={{
								axisLabel: {fontSize: 8},
								tickLabels: {fontSize: 8},
								grid: {stroke: d => d === metaData.yCenter ? "gray" : "lightgray"},
								axis: {visibility: "hidden"}
							}}
						/>
						<VictoryArea
							data={series.data.map(p => {return {x: p.x, y: p.y, y0: 0}})}
							style={{data: {fill: "url(#turn-played-gradient)"}}}
							interpolation="monotoneX"
						/>
						<VictoryLine
							data={series.data}
							interpolation="monotoneX"
							style={{data: {strokeWidth: 1}}}
						/>
						<VictoryScatter
							data={series.data}
							size={1}
						/>
						<VictoryVoronoiTooltip
							data={series.data}
							labels={d => "Turn " + d.x + "\n" + d.y + "%"}
							labelComponent={tooltip}
							style={{
								labels: {fontSize: 6, padding: 5}
							}}
						/>
					</VictoryChart>
				</svg>
			];
		}

		return (
			<svg viewBox={"0 0 " + width + " 150"}>
				{content}
				<VictoryLabel text={"Popularity - by turn played"} style={{fontSize: 10}} textAnchor="start" verticalAnchor="start" x={0} y={10}/>
			</svg>
		);
	}

	readonly mockData: RenderQueryData = {
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
			]
		}]
	};
}
