import * as React from "react";
import {VictoryArea, VictoryAxis, VictoryChart, VictoryGroup, VictoryLine, VictoryScatter, VictoryTooltip} from "victory";
import moment from "moment";

interface Data {
	date: Date;
	rank: number;
	y0?: number;
	legend?: boolean;
}

interface RankLineChartProps extends React.ClassAttributes<RankLineChart> {
	mainData: Data[];
	overlayData?: Data[][];
	minRank?: number;
	maxRank?: number;
}

export default class RankLineChart extends React.Component<RankLineChartProps, any> {

	render(): JSX.Element {
		const overlays = [];
		let ranks = this.props.mainData.map(x => x.rank);
		let minRank = this.props.minRank || Math.max(...ranks);
		let maxRank = this.props.maxRank !== undefined ? this.props.maxRank : Math.min(...ranks);
		console.log(minRank, maxRank)
		const rankTicks = [];
		for (let i = minRank; i >= maxRank; i -= (minRank - maxRank)/5) {
			rankTicks.push(Math.floor(i - maxRank));
			console.log(i, maxRank)
		}
		const data = this.props.mainData.map((x, i) => {
			const y0 = Math.floor(Math.max(Math.min(minRank + maxRank - (x.rank + Math.random() * 3), minRank), maxRank))
			const mr = Math.floor(Math.max(Math.min(minRank + maxRank - (x.rank + Math.random() * 2 - 2), minRank), maxRank))
			console.log("y0", y0, "maxRank", mr)
			return {
				rank: minRank + maxRank - x.rank,
				date: x.date,
				maxRank: mr,
				y0: y0,
				tendency: 0,
			}
		});
		data.forEach((d, i) => {
			if (i > 0) {
				d.tendency = d.rank - data[i-1].rank
			}
		})
		const overlayData = this.props.overlayData && this.props.overlayData.map(x => x.map(x1 => {return {rank: minRank - x1.rank, date: x1.date}}));
		console.log(overlayData);
		if (overlayData) {
			overlayData.forEach(d => {
				overlays.push(
					<VictoryLine
						data={d}
						x="date"
						y="rank"
						interpolation="natural"
						style={{data: {stroke: "red"}}}
					/>
				);
			})
		}
		return <VictoryChart height={120} padding={{top: 20, bottom: 20, left: 50, right: 50}}>
			<VictoryAxis label="Rank" dependentAxis tickValues={rankTicks} tickFormat={tick => minRank + maxRank - tick} style={{grid: {stroke: "gray"}, axisLabel: {fontSize: 10}, tickLabels: {fontSize: 10}}}/>
			<VictoryAxis label="Date" style={{axisLabel: {fontSize: 10}, tickLabels: {fontSize: 10}}} tickFormat={x => moment(x).format("MMM Do")} />
			<VictoryGroup>
				<VictoryArea
					data={data}
					x="date"
					y="maxRank"
					interpolation="natural"
					style={{data: {fill: "rgba(32, 112, 223, 0.5)"}}}
				/>
				<VictoryLine
					data={data}
					x="date"
					y="rank"
					interpolation="natural"
					style={{data: {stroke: "rgba(0, 0, 255, 0.5)"}}}
				/>
				<VictoryScatter
					data={data}
					x="date"
					y="rank"
					maxBubbleSize={0.1}
					symbol={d => d.tendency === 0 ? "circle" : (d.tendency > 0 ? "triangleUp" : "triangleDown")}
					size={2}
					labels={x => moment(x.date).format("MMM Do") + "\nFinal rank " + (minRank + maxRank - x.rank) + "\nLowest rank: " + (minRank + maxRank - x.y0) + "\nHighest rank: " + (minRank + maxRank - x.maxRank)}
					labelComponent={<VictoryTooltip pointerLength={0} cornerRadius={0} dy={x => x.rank > minRank*0.6 ? -40 : 0}/>}
					style={{
						data: {
							fill: d => d.tendency == 0 ? "rgba(0, 0, 0, 0.7)" : (d.tendency > 0 ? "rgba(0, 255, 0, 0.7)" : "rgba(255, 0, 0, 0.7)"),
							stroke: "(0, 0, 0, 0.5)",
							strokeWidth: 1
						},
						labels: {fontSize: 8, padding: 5}}}
				/>
			</VictoryGroup>
		</VictoryChart>
	}
}
