import * as React from "react";
import {
	VictoryAxis, VictoryArea, VictoryChart, VictoryContainer, VictoryLabel, 
	VictoryLine, VictoryVoronoiTooltip, VictoryTooltip
} from "victory";
import {ChartSeries} from "../../interfaces";
import {getChartMetaData, toTimeSeries} from "../../helpers";
import WinLossGradient from "./gradients/WinLossGradient";

interface WinrateByTurnLineChartProps {
	series: ChartSeries;
	widthRatio?: number;
}

export default class WinrateByTurnLineChart extends React.Component<WinrateByTurnLineChartProps, any> {
	constructor(props: WinrateByTurnLineChartProps, state: any) {
		super(props, state);
		this.state = {
			cursorPos: null,
		}
	}

	render(): JSX.Element {
		const width = 150 * (this.props.widthRatio || 3);

		let content = null;

		if (this.props.series) {
			const elements = [];
			const series = toTimeSeries(this.props.series);
			const metaData = getChartMetaData(series.data, 50, false);

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
					<WinLossGradient id="winrate-by-turn-gradient" metadata={metaData} />
				</defs>,
				<VictoryChart
					height={150}
					width={width}
					containerComponent={<VictoryContainer title={""}/>}
					domainPadding={{x: 0, y: 10}}
					padding={{left: 40, top: 30, right: 20, bottom: 30}}
					domain={{x: metaData.xDomain, y: metaData.yDomain}}
					>
					<VictoryAxis
						tickFormat={tick => "Turn " + tick}
						style={{axisLabel: {fontSize: 8}, tickLabels: {fontSize: 8}, grid: {stroke: "gray"}, axis: {visibility: "hidden"}}}/>
					<VictoryAxis
						dependentAxis
						axisLabelComponent={<VictoryLabel dx={10} />}
						tickValues={[50].concat(metaData.yDomain)}
						tickFormat={tick => tick + " %"}
						style={{axisLabel: {fontSize: 8} ,tickLabels: {fontSize: 8}, grid: {stroke: d => d === 50 ? "gray" : "transparent"}, axis: {visibility: "hidden"}}}
						/>
					<VictoryArea
						data={series.data.map(p => {return {x: p.x, y: p.y, y0: 50}})}
						style={{data: {fill: "url(#winrate-by-turn-gradient)"}}}
						interpolation="step"
					/>
					<VictoryLine
						data={series.data}
						interpolation="step"
						style={{data: {strokeWidth: 1}}}
					/>
					<VictoryVoronoiTooltip
						data={series.data.map(d => {return {x: d.x, y: 50, yValue: d.y}})}
						labels={d => "Turn " + d.x + "\n" + d.yValue + "%"}
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

		return <svg viewBox={"0 0 " + width + " 150"}>
			{content}
			<VictoryLabel text={"Winrate - by turn played"} style={{fontSize: 10}} textAnchor="start" verticalAnchor="start" x={0} y={10}/>
		</svg>;
	}
}
