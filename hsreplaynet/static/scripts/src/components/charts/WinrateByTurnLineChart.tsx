import * as React from "react";
import {
	VictoryArea, VictoryAxis, VictoryChart, VictoryContainer, VictoryLabel,
	VictoryLine, VictoryScatter,
} from "victory";
import {VictoryVoronoiContainer} from "victory";
import {getChartMetaData, toTimeSeries} from "../../helpers";
import {RenderData} from "../../interfaces";
import ChartHighlighter from "./ChartHighlighter";
import WinLossGradient from "./gradients/WinLossGradient";

interface WinrateByTurnLineChartProps {
	data?: RenderData;
	opponentClass?: string;
	widthRatio?: number;
	premiumLocked?: boolean;
}

export default class WinrateByTurnLineChart extends React.Component<WinrateByTurnLineChartProps, any> {
	constructor(props: WinrateByTurnLineChartProps, state: any) {
		super(props, state);
		this.state = {
			cursorPos: null,
		};
	}

	render(): JSX.Element {
		const width = 150 * (this.props.widthRatio || 3);
		const renderData = this.props.premiumLocked ? this.mockData : this.props.data;

		const elements = [];
		const series = renderData.series.find((s) => s.name === "winrates_by_turn"
			&& (this.props.opponentClass === "ALL" || s.metadata["opponent_class"] === this.props.opponentClass));

		const metaData = getChartMetaData(series.data, 50, false, 10);

		const minAbove50 = metaData.yMinMax[0].y > 50;
		const maxBelow50 = metaData.yMinMax[1].y < 50;
		const isMinTick = (tick: number) => tick === metaData.yDomain[0];
		const isMaxTick = (tick: number) => tick === metaData.yDomain[1];

		const yTicks = [50];
		metaData.yDomain.forEach((value) => yTicks.indexOf(value) === -1 && yTicks.push(value));

		return <svg viewBox={"0 0 " + width + " 150"}>
			<defs>
				<WinLossGradient id="winrate-by-turn-gradient" metadata={metaData} />
				<filter id="winrate-gaussian-blur">
					<feGaussianBlur in="SourceGraphic" stdDeviation="2" />
				</filter>
			</defs>
			<svg filter={this.props.premiumLocked && "url(#winrate-gaussian-blur)"}>
				<VictoryChart
					height={150}
					width={width}
					containerComponent={<VictoryContainer title={""}/>}
					domainPadding={{x: 5, y: 10}}
					padding={{left: 40, top: 30, right: 20, bottom: 30}}
					domain={{x: metaData.xDomain, y: metaData.yDomain}}
				>
					<VictoryAxis
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
						axisLabelComponent={<VictoryLabel dx={10} />}
						tickValues={yTicks}
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
							return metaData.toFixed(tick) + "%";
						}}
						style={{
							axisLabel: {fontSize: 8},
							tickLabels: {fontSize: 8},
							grid: {stroke: (tick) => tick === 50 ? "gray" : (minAbove50 && isMinTick(tick) || maxBelow50 && isMaxTick(tick) ? "transparent" : "lightgray")},
							axis: {visibility: "hidden"},
						}}
						/>
					<VictoryLine
						data={series.data}
						interpolation="monotoneX"
						style={{data: {strokeWidth: 1}}}
					/>
					<VictoryScatter
						data={series.data}
						symbol="circle"
						size={1}
					/>
					<VictoryArea
						data={series.data.map((p) => {return {x: p.x, y: p.y, _y0: 50}; })}
						style={{data: {fill: "url(#winrate-by-turn-gradient)"}}}
						interpolation="monotoneX"
						containerComponent={<VictoryVoronoiContainer
							dimension="x"
							labels={(d) => "Turn " + d.x + "\n" + d.y + "%"}
							labelComponent={<ChartHighlighter xCenter={metaData.xCenter} />}
						/>}
					/>
				</VictoryChart>
			</svg>
			<VictoryLabel text={"Winrate - by turn played"} style={{fontSize: 10}} textAnchor="start" verticalAnchor="start" x={0} y={10}/>
		</svg>;
	}

	readonly mockData: RenderData = {
		series: [{
			name: "winrates_by_turn",
			data: [
				{y: 54, x: 1},
				{y: 46, x: 2},
				{y: 54, x: 3},
				{y: 46, x: 4},
				{y: 54, x: 5},
				{y: 46, x: 6},
				{y: 54, x: 7},
				{y: 46, x: 8},
				{y: 54, x: 9},
				{y: 46, x: 10},
			],
		}],
	};
}
