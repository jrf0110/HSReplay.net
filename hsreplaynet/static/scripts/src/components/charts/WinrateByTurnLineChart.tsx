import * as React from "react";
import {
	VictoryArea, VictoryAxis, VictoryChart, VictoryContainer, VictoryLabel, VictoryScatter,
} from "victory";
import {VictoryVoronoiContainer} from "victory";
import {getChartMetaData} from "../../helpers";
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

		const series = renderData.series.find((s) => s.name === "winrates_by_turn"
			&& (this.props.opponentClass === "ALL" || s.metadata["opponent_class"] === this.props.opponentClass));

		const yDomain: [number, number] = [Number.MAX_SAFE_INTEGER, 0];
		renderData.series.filter((s) => s.name === "winrates_by_turn").forEach((s) => {
			const metaData = getChartMetaData(s.data, 50, false, 10);
			yDomain[0] = Math.min(metaData.yDomain[0], yDomain[0]);
			yDomain[1] = Math.max(metaData.yDomain[1], yDomain[1]);
		});

		const metaData = getChartMetaData(series.data, 50, false, 10);

		const yTicks = [50];
		yDomain.forEach((value) => yTicks.indexOf(value) === -1 && yTicks.push(value));

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
					padding={{left: 40, top: 10, right: 20, bottom: 40}}
					domain={{x: metaData.xDomain, y: yDomain}}
				>
					<VictoryAxis
						tickCount={series.data.length}
						tickFormat={(tick) => tick}
						label="Turn"
						style={{
							axisLabel: {fontSize: 8},
							tickLabels: {fontSize: 8},
							grid: {stroke: "lightgray"},
							axis: {visibility: "hidden"},
						}}
					/>
					<VictoryAxis
						dependentAxis
						label="Winrate"
						axisLabelComponent={<VictoryLabel dy={-1} dx={30} />}
						tickValues={yTicks}
						tickFormat={(tick) => {
							if (tick === 50) {
								return "50%";
							}
							return metaData.toFixed(tick) + "%";
						}}
						style={{
							axis: {visibility:  "hidden"},
							axisLabel: {fontSize: 8},
							grid: {stroke: (tick) => tick === 50 ? "gray" : "lightgray"},
							tickLabels: {fontSize: 8},
						}}
					/>
					<VictoryScatter
						data={series.data}
						symbol="circle"
						size={1}
					/>
					<VictoryArea
						data={series.data.map((p) => {return {x: p.x, y: p.y, _y0: 50}; })}
						style={{data: {fill: "url(#winrate-by-turn-gradient)", stroke: "black", strokeWidth: 0.3}}}
						interpolation="monotoneX"
						containerComponent={<VictoryVoronoiContainer
							dimension="x"
							labels={(d) => "Turn " + d.x + "\n" + d.y + "%"}
							labelComponent={<ChartHighlighter xCenter={metaData.xCenter} />}
						/>}
					/>
				</VictoryChart>
			</svg>
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
