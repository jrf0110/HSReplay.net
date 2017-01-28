import * as React from "react";
import {ChartSeries} from "../../interfaces";
import {VictoryContainer, VictoryLabel, VictoryPie} from "victory";

interface CardDetailPieChartState {
	text?: string;
}

interface CardDetailPieChartProps extends React.ClassAttributes<CardDetailPieChart> {
	data: ChartSeries[];
	title: string;
}

export default class CardDetailPieChart extends React.Component<CardDetailPieChartProps, CardDetailPieChartState> {
	constructor(props: CardDetailPieChartProps, state: CardDetailPieChartState) {
		super(props, state);
		this.state = {
			text: null,
		}
	}

	render(): JSX.Element {
		const series = this.props.data[0];
		const data = (series.data as any).sort((a, b) => a.y > b.y ? -1 : 1);
		return <svg viewBox="0 0 400 450">
			<VictoryPie
				containerComponent={<VictoryContainer title={this.props.title}/>}
				animate={{duration: 300}}
				height={400}
				width={400}
				data={data}
				style={{
					data: {
						transition: "transform .2s ease-in-out",
						fill: p => this.getColor(p.xName),
						stroke: "blue"
					},
				}}
				labels={[]}
				events={[
					{
						target: "data",
						eventHandlers: {
							onMouseOver: () => {
								return [{
									mutation: props => {
										this.setState({text: this.getClassName(props.style.xName) + ": " + Math.round(props.slice.value) + "%"})
										return {
											style: Object.assign({}, props.style, {transform: "scale(1.1)"})
										};
									}
								}]
							},
							onMouseOut: () => {
								this.setState({text: null})
								return [{
									mutation: () => null
								}];
							},
						}
					}
				]}
			/>
			<VictoryLabel textAnchor="middle" verticalAnchor="middle" x={200} y={400} text={this.state.text || this.props.title} style={{fontSize: 40}}/>
		</svg>;
	}

	private getClassName(hero: string): string {
		return hero.substring(0, 1).toUpperCase() + hero.substring(1, hero.length).toLowerCase();
	}

	private getColor(hero: string): string {
		switch(hero.toUpperCase()) {
			case "DRUID": return "#FF7D0A";
			case "HUNTER": return "#ABD473";
			case "MAGE": return "#69CCF0";
			case "PALADIN": return "#F58CBA";
			case "PRIEST": return "#D2D2D2";
			case "ROGUE": return "#FFF01a";
			case "SHAMAN": return "#0070DE";
			case "WARLOCK": return "#9482C9";
			case "WARRIOR": return "#C79C6E";
		}
	}
}
