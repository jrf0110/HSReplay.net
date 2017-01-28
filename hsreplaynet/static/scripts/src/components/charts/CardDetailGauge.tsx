import * as React from "react";
import {ChartSeries} from "../../interfaces";
import {VictoryContainer, VictoryLabel, VictoryPie} from "victory";

interface CardDetailGaugeProps extends React.ClassAttributes<CardDetailGauge> {
	data: ChartSeries[];
	title: string;
}

export default class CardDetailGauge extends React.Component<CardDetailGaugeProps, any> {

	render(): JSX.Element {
		const series = this.props.data[0];
		return <svg viewBox="0 0 400 450">
			<VictoryPie
				containerComponent={<VictoryContainer title={this.props.title}/>}
				animate={{duration: 300}}
				height={400}
				width={400}
				data={series.data as any}
				innerRadius={70}
				style={{
					data: {
						fill: d => d.xName === "empty" ? "rgba(0, 0, 255, 0.2)" : "rgba(0, 0, 255, 0.7)",
						stroke: "blue"
					},
				}}
				labels={[]}
			/>
			<VictoryLabel textAnchor="middle" verticalAnchor="middle" x={200} y={200} text={series.data[0].y + "%"} style={{fontSize: 40}}/>
			<VictoryLabel textAnchor="middle" verticalAnchor="middle" x={200} y={400} text={this.props.title} style={{fontSize: 40}}/>
		</svg>;
	}

}
