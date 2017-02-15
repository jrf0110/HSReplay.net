import * as React from "react";
import {
	VictoryAxis, VictoryBar, VictoryChart, VictoryContainer, VictoryLabel,
	VictoryStack, VictoryVoronoiTooltip
} from "victory";
import {ChartSeries} from "../../interfaces";
import {getChartScheme} from "../../helpers";

interface CardDetailBarChartProps {
	series: ChartSeries;
	title: string;
	labelX?: string;
	labelY?: string;
	widthRatio?: number;
	showYAxis?: boolean;
}

export default class CardDetailBarChart extends React.Component<CardDetailBarChartProps, any> {
	render(): JSX.Element {
		const width = 150 * (this.props.widthRatio || 3);

		let content = null;

		if(this.props.series) {
			let fill = null;
			let stroke = null;

			let scheme = null;
			let tickFormat = null;
			if (this.props.series.metadata) {
				const schemeName = this.props.series.metadata["chart_scheme"];
				if (schemeName) {
					scheme = getChartScheme(schemeName);
					if (scheme) {
						fill = (prop) => scheme[prop.xName.toLowerCase()].fill;
						stroke = (prop) => scheme[prop.xName.toLowerCase()].stroke;
						if (schemeName === "cost") {
							tickFormat = (tick) => {
								const val = this.props.series.data[+tick-1].x
								return scheme[val].name || val;
							}
						}
					}
				}
			}
			else {
				fill = "rgba(0, 0, 255, 0.3)";
				stroke = "blue";
			}

			let yAxis = null;
			if (this.props.showYAxis) {
				yAxis = (
					<VictoryAxis
						dependentAxis
						axisLabelComponent={<VictoryLabel dx={10} />}
						label={this.props.labelY}
						style={{axisLabel: {fontSize: 12} ,tickLabels: {fontSize: 12}}}
					/>
				);
			}


			content = (
				<VictoryChart
						containerComponent={<VictoryContainer title={this.props.title}/>}
						domainPadding={{x: Math.max(20, 180/this.props.series.data.length), y: 0}}
						height={150}
						width={width}
						padding={{left: 10, top: 30, right: 10, bottom: 40}}
					>
					<VictoryAxis
						label={this.props.labelX}
						offsetY={38}
						tickLabelComponent={<VictoryLabel dy={-0.4}/>}
						tickFormat={tickFormat}
						style={{axisLabel: {fontSize: 12}, tickLabels: {fontSize: 12}, grid: {strokeWidth: 0}}}
					/>
					{yAxis}
					<VictoryBar
						data={this.props.series.data}
						style={{
							data: {
								width: ''+(0.7 * width / this.props.series.data.length),
								fill: fill,
								stroke: stroke,
								strokeWidth: 0.5
							}
						}}
					/>
				</VictoryChart>
			);
		}
		else {
			content = (
				<svg viewBox={"0 0 " + width + " 150"}>
					<VictoryLabel text={"Loading..."} style={{fontSize: 14}} textAnchor="middle" verticalAnchor="middle" x={width/2} y={75}/>
				</svg>
			);
		}

		return content;
	}
}
