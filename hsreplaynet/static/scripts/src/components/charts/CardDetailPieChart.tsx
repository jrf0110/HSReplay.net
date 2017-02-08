import * as React from "react";
import {ChartSeries, ChartScheme} from "../../interfaces";
import {VictoryContainer, VictoryLabel, VictoryPie, VictoryTheme} from "victory";
import {getChartScheme, toTitleCase} from "../../helpers";

interface CardDetailPieChartState {
	text?: string;
}

interface CardDetailPieChartProps extends React.ClassAttributes<CardDetailPieChart> {
	series: ChartSeries;
	title: string;
	percent?: boolean;
	scheme?: ChartScheme;
	sortByValue?: boolean;
	removeEmpty?: boolean;
	textPrecision?: number;
}

export default class CardDetailPieChart extends React.Component<CardDetailPieChartProps, CardDetailPieChartState> {
	constructor(props: CardDetailPieChartProps, state: CardDetailPieChartState) {
		super(props, state);
		this.state = {
			text: null,
		}
	}

	render(): JSX.Element {
		let content = null;
		const labelText = this.state.text || this.props.title;

		if (this.props.series) {
			let data = this.props.series.data;
			let fill = null;
			let stroke = null;
			let scheme = this.props.scheme;

			if (!scheme && this.props.series.metadata && this.props.series.metadata["chart_scheme"]) {
				scheme = getChartScheme(this.props.series.metadata["chart_scheme"]);
			}

			if (scheme) {
				fill = (prop) => scheme[prop.xName.toLowerCase()].fill;
				stroke = (prop) => scheme[prop.xName.toLowerCase()].stroke;
				data = Object.keys(scheme).map(key => data.find(d => (''+d.x).toLowerCase() === key.toLowerCase()) || {x: key, y: 0});
				if (this.props.removeEmpty) {
					data = data.filter(x => x.y > 0);
				}
			}

			if (this.props.sortByValue) {
				data = data.sort((a, b) => a.y > b.y ? -1 : 1);
			}

			content = (
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
							strokeWidth: this.props.series.data.length > 1 ? 2 : 0,
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
												text: this.getText(scheme, props.style.xName, props.slice.value),
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
			);
		}
		else {
			content = <VictoryLabel text={"Loading..."} style={{fontSize: 32}} textAnchor="middle" verticalAnchor="middle" x={200} y={200}/>
		}

		return <svg viewBox="0 0 400 450">
			{content}
			<VictoryLabel textAnchor="middle" verticalAnchor="middle" x={200} y={400} text={labelText} style={{fontSize: Math.min(40, 60 - Math.ceil(labelText.length/5 + 1)*5)}}/>
		</svg>;
	}

	getText(scheme: ChartScheme, key: string, value: number): string {
		const name = scheme && scheme[key.toLowerCase()].name || key;
		const valueText = value.toFixed(this.props.textPrecision || 0) + (this.props.percent ? "%" : "");
		return name + ": " + valueText
	}
}
