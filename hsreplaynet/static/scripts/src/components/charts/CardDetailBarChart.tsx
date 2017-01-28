import * as React from "react";
import {VictoryAxis, VictoryArea, VictoryBar, VictoryChart, VictoryContainer, VictoryGroup, VictoryLabel, VictoryLine, VictoryScatter, VictoryStack, VictoryVoronoiTooltip} from "victory";
import {ChartSeries} from "../../interfaces";
import {getChartScheme} from "../../helpers";

interface CardDetailBarChartProps {
	data: ChartSeries[];
	title: string;
	domainY?: [number, number];
	domainX?: [number, number];
	labelX?: string;
	labelY?: string;
}

export default class CardDetailBarChart extends React.Component<CardDetailBarChartProps, any> {
	render(): JSX.Element {
		const lines = [];
		this.props.data.forEach(series => {
			if (series.metadata && series.metadata.is_winrate_data) {
				const data1 = series.data.map(p => {return {x: p.x, y: Math.min(50, p.y)}});
				const data2 = series.data.map(p => {return {x: p.x, y: Math.abs(p.y - 50), pos: p.y >= 50}});
				lines.push(
					<VictoryStack>
						<VictoryBar
							data={data1}
							animate={{duration: 300}}
							style={{
								data: {
									width: 200/series.data.length,
									fill: "rgba(0, 0, 255, 0.3)",
									stroke: "blue",
									strokeWidth: 0.5
								}
							}}
						/>
						<VictoryBar
							data={data2}
							animate={{duration: 300}}
							style={{
								data: {
									width: 200/series.data.length,
									fill: d => d.pos ? "rgba(0, 255, 0, 0.3)" : "rgba(255, 0, 0, 0.3)",
									stroke: "blue",
									strokeWidth: 0.5
								}
							}}
						/>
					</VictoryStack>
				);
			}
			else {
				let fill: any;
				let stroke: any;
				if (series.metadata && series.metadata.chart_scheme) {
					const scheme = getChartScheme(series.metadata.chart_scheme);
					if (scheme) {
						fill = (prop) => scheme[prop.xName.toLowerCase()].fill;
						stroke = (prop) => scheme[prop.xName.toLowerCase()].stroke;
					}
				}
				else {
					fill = "rgba(0, 0, 255, 0.3)";
					stroke = "blue";
				}
				lines.push(
					<VictoryBar
						data={series.data}
						animate={{duration: 300}}
						style={{
							data: {
								width: ''+(180/series.data.length),
								fill: fill,
								stroke: stroke,
								strokeWidth: 0.5
							}
						}}
				/>)
			}
		});
		return <VictoryChart
			containerComponent={<VictoryContainer title={this.props.title}/>}
			domainPadding={{x: Math.max(20, 150/this.props.data[0].data.length), y: 0}}
			height={150}
			padding={{left: 50, top: 30, right: 30, bottom: 40}}
			theme="material">
			<VictoryAxis
				label={this.props.labelX}
				domain={this.props.domainX}
				style={{axisLabel: {fontSize: 12}, tickLabels: {fontSize: 12}, grid: {strokeWidth: 0}}}/>
			<VictoryAxis
				dependentAxis
				axisLabelComponent={<VictoryLabel dx={10} />}
				label={this.props.labelY}
				style={{axisLabel: {fontSize: 12} ,tickLabels: {fontSize: 12}}}
				domain={this.props.domainY}/>
			{lines}
		</VictoryChart>;
	}
}
