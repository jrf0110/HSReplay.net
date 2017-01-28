import * as React from "react";
import {VictoryAxis, VictoryArea, VictoryChart, VictoryContainer, VictoryGroup, VictoryLabel, VictoryLine, VictoryScatter, VictoryVoronoiTooltip} from "victory";
import {ChartSeries} from "../../interfaces";

interface CardDetailLineChartProps {
	data: ChartSeries[];
	title: string;
	domainY?: [number, number];
	domainX?: [number, number];
	labelX?: string;
	labelY?: string;
}

export default class CardDetailLineChart extends React.Component<CardDetailLineChartProps, any> {
	render(): JSX.Element {
		const lines = [];
		this.props.data.forEach(series => {
			lines.push(<VictoryArea
				data={series.data.map(p => {return {x: p.x, y: p.y, y0: 50}})}
				animate={{duration: 300}}
				style={{data: {fill: "rgba(0, 0, 255, 0.3)"}}}
				interpolation="natural"
			/>)
		});
		this.props.data.filter(x => true || x.metadata && x.metadata.is_winrate_data).forEach(data => {
			lines.push(<VictoryLine
				data={[{x: data.data[0].x, y: 50}, {x: data.data[data.data.length - 1].x, y: 50}]}
				interpolation="natural"
			/>)
		})
		this.props.data.forEach(series => {
			lines.push(
				<VictoryLine
					label={series.name}
					data={series.data}
					animate={{duration: 300}}
					interpolation="natural"
			/>)
		});

		return <svg viewBox="0 0 450 150">
			<VictoryChart
				containerComponent={<VictoryContainer title={this.props.title}/>}
				domainPadding={{x: 0, y: this.props.domainY ? 0 : 10}}
				padding={{left: 50, top: 30, right: 30, bottom: 40}}
				theme="material">
				<VictoryAxis
					label={this.props.labelX}
					domain={this.props.domainX}
					style={{axisLabel: {fontSize: 12}, tickLabels: {fontSize: 12}}}/>
				<VictoryAxis
					dependentAxis
					axisLabelComponent={<VictoryLabel dx={10} />}
					label={this.props.labelY}
					style={{axisLabel: {fontSize: 12} ,tickLabels: {fontSize: 12}}}
					domain={this.props.domainY}/>
				{lines}
			</VictoryChart>
			<VictoryLabel text={this.props.title} textAnchor="middle" verticalAnchor="start" x={225} y={10}/>
		</svg>;
	}
}
