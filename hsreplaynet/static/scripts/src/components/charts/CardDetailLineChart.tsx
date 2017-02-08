import * as React from "react";
import {VictoryAxis, VictoryArea, VictoryChart, VictoryContainer, VictoryGroup, VictoryLabel, VictoryLine, VictoryScatter, VictoryVoronoiTooltip} from "victory";
import {ChartSeries} from "../../interfaces";
import {toTimeSeries} from "../../helpers";

interface CardDetailLineChartProps {
	series: ChartSeries;
	title: string;
	labelX?: string;
	labelY?: string;
	timeData?: boolean;
	widthRatio?: number;
}

export default class CardDetailLineChart extends React.Component<CardDetailLineChartProps, any> {
	render(): JSX.Element {
		const width = 150 * (this.props.widthRatio || 3);

		let content = null;

		if (this.props.series) {
			const lines = [];
			const series = toTimeSeries(this.props.series);

			lines.push(
				<VictoryArea
					data={series.data.map(p => {return {x: p.x, y: p.y, y0: 50}})}
					animate={{duration: 300}}
					style={{data: {fill: "rgba(0, 0, 255, 0.3)"}}}
					interpolation="natural"
				/>
			);

			if (series.metadata["is_winrate_data"]) {
				lines.push(
					<VictoryLine
						data={[{x: series.data[0].x, y: 50}, {x: series.data[series.data.length - 1].x, y: 50}]}
						interpolation="natural"
						style={{data: {strokeWidth: 1}}}
					/>
				)
			}

			lines.push(
				<VictoryLine
					label={series.name}
					data={series.data}
					animate={{duration: 300}}
					interpolation="natural"
					style={{data: {strokeWidth: 1}}}
				/>
			)

			content = (
				<VictoryChart
					height={150}
					width={width}
					containerComponent={<VictoryContainer title={""}/>}
					domainPadding={{x: 0, y: 10}}
					padding={{left: 50, top: 30, right: 30, bottom: 40}}
					>
					<VictoryAxis
						label={this.props.labelX}
						scale={this.props.timeData ? "time" : "linear"}
						style={{axisLabel: {fontSize: 8}, tickLabels: {fontSize: 8}, grid: {stroke: "gray"}}}
					/>
					<VictoryAxis
						dependentAxis
						axisLabelComponent={<VictoryLabel dx={10} />}
						label={this.props.labelY}
						style={{axisLabel: {fontSize: 8} ,tickLabels: {fontSize: 8}, grid: {stroke: "gray"}}}
					/>
					{lines}
				</VictoryChart>
			);
		}
		else {
			content = <VictoryLabel text={"Loading..."} style={{fontSize: 14}} textAnchor="middle" verticalAnchor="middle" x={width/2} y={75}/>
		}

		return <svg viewBox={"0 0 " + width +  " 150"}>
			<VictoryLabel text={this.props.title} style={{fontSize: 10}} textAnchor="middle" verticalAnchor="start" x={width/2} y={10}/>
		</svg>;
	}
}
