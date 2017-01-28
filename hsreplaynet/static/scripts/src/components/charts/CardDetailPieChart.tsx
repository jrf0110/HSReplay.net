import * as React from "react";
import {ChartSeries} from "../../interfaces";
import {VictoryContainer, VictoryLabel, VictoryPie, VictoryTheme} from "victory";
import {getChartScheme, toTitleCase} from "../../helpers";

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
		let data = (series.data as any).sort((a, b) => a.y > b.y ? -1 : 1);

		let fill: any;
		let stroke: any;
		let scheme = null;
		const strokeWidth = data.length > 1 ? 2 : 0;
		if (series.metadata && series.metadata.chart_scheme) {
			scheme = getChartScheme(series.metadata.chart_scheme);
			if (scheme) {
				fill = (prop) => scheme[prop.xName.toLowerCase()].fill;
				stroke = (prop) => scheme[prop.xName.toLowerCase()].stroke;
				data = Object.keys(scheme).map(key => data.find(d => d.x.toLowerCase() === key.toLowerCase()) || {x: key, y: 0});
			}
		}
		else {
			// fill = (prop) => this.getColor(prop.xName);
			// stroke = "blue";
		}
		const labelText = this.state.text || this.props.title;
		return <svg viewBox="0 0 400 450">
			<VictoryPie
				containerComponent={<VictoryContainer title="" />}
				theme={VictoryTheme.material}
				animate={{duration: 300}}
				height={400}
				width={400}
				data={data}
				style={{
					data: {
						transition: "transform .2s ease-in-out",
						fill: fill,
						strokeWidth: strokeWidth,
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
										this.setState({
											text: (scheme && scheme[props.style.xName].name ? scheme[props.style.xName].name : props.style.xName) + ": " + Math.round(props.slice.value) + "%"
										})
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
			<VictoryLabel textAnchor="middle" verticalAnchor="middle" x={200} y={400} text={labelText} style={{fontSize: Math.min(40, 60 - Math.ceil(labelText.length/5 + 1)*5)}}/>
		</svg>;
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
