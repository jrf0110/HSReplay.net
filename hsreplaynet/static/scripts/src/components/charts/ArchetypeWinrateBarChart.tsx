import * as React from "react";
import {VictoryAxis, VictoryBar, VictoryChart, VictoryLabel, VictoryStack, VictoryPortal} from "victory";

interface ArchetypeData {
	name: string;
	baseWinrate: number;
	winrateDiff: number;
}

interface DiffData {
	name: string;
	absValue: number;
	positive: boolean;
}

interface ArchetypeWinrateBarChartProps extends React.ClassAttributes<ArchetypeWinrateBarChart> {
	data: ArchetypeData[];
	height?: number;
}

export default class ArchetypeWinrateBarChart extends React.Component<ArchetypeWinrateBarChartProps, any> {
	private readonly green = "#8ce62c";
	private readonly red = "#f77a70";
	render(): JSX.Element {
		let tickFormat = [];
		let diffData = [];
		this.props.data.forEach(data => {
			tickFormat.push(data.name + " (" + (data.baseWinrate + Math.max(data.winrateDiff, 0)) + "%)");
			diffData.push({name: data.name, absValue: Math.abs(data.winrateDiff), positive: data.winrateDiff > 0});
		})
		return <VictoryChart height={this.props.height} >
			<VictoryAxis
				dependentAxis
				tickFormat={tickFormat}
				offsetX={40}
				tickCount={tickFormat.length}
				style={{
					tickLabels: {
						fontSize: 10,
						fontWeight: "bold",
						fill: "white",
						textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000"
					}
				}}
				tickLabelComponent={<VictoryPortal><VictoryLabel x={60} textAnchor="start"/></VictoryPortal>}
			/>
			<VictoryStack
				horizontal={true}
				labels={x => this.stringifyDiff(x)}
				style={{
					data: {strokeWidth: 0.75, stroke: "black"},
					labels: {fontSize: 12, 	fill: d => d.positive ? "green" : "red"}
				}}>
				<VictoryBar name="bar-base"
					y="baseWinrate"
					x="name"
					data={this.props.data}
					style={{
						data: {width: 20, fill: d => d.color}
					}}
				/>
				<VictoryBar name="bar-diff"
					y="absValue"
					x="name"
					data={diffData}
					style={{
						data: {width: 20, fill: x => x.positive ? this.green : this.red}
					}}
				/>
			</VictoryStack>
		</VictoryChart>;
	}

	private stringifyDiff(diff: DiffData): string {
		if (diff.absValue === 0) {
			return "";
		}
		const prefix = diff.positive ? "+" : "-";
		return prefix + diff.absValue + "%";
	}
}
