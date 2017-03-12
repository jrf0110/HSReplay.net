import * as React from "react";
import {VictoryContainer, VictoryLabel, VictoryLegend, VictoryPie, VictoryTheme} from "victory";
import {getChartScheme, toTitleCase} from "../../helpers";
import {ChartScheme, RenderData} from "../../interfaces";

interface CardDetailPieChartProps extends React.ClassAttributes<CardDetailPieChart> {
	data?: RenderData;
	title: string;
	scheme?: ChartScheme;
	sortByValue?: boolean;
	removeEmpty?: boolean;
}

export default class CardDetailPieChart extends React.Component<CardDetailPieChartProps, void> {
	render(): JSX.Element {
		const series = this.props.data.series[0];
		let data = series.data;
		let fill = null;
		let stroke = null;
		let scheme = this.props.scheme;
		const legendData = [];

		if (!scheme && series.metadata && series.metadata["chart_scheme"]) {
			scheme = getChartScheme(series.metadata["chart_scheme"]);
		}

		if (scheme) {
			fill = (prop) => scheme[prop.xName.toLowerCase()].fill;
			stroke = (prop) => scheme[prop.xName.toLowerCase()].stroke;
			data = Object.keys(scheme).map((key) => data.find((d) => ("" + d.x).toLowerCase() === key.toLowerCase()) || {x: key, y: 0});
			if (this.props.removeEmpty) {
				data = data.filter((x) => x.y > 0);
			}
			data.forEach((d) => {
				legendData.push(
					{name: toTitleCase("" + d.x), symbol: {type: "circle", fill: scheme[("" + d.x).toLowerCase()].stroke}},
				);
			});
		}

		if (this.props.sortByValue) {
			data = data.sort((a, b) => a.y > b.y ? -1 : 1);
		}

		return <svg viewBox="0 0 400 400">
			<VictoryPie
				containerComponent={<VictoryContainer title="" />}
				animate={{duration: 300}}
				labels={(d) => (d.y).toFixed(0) + "%"}
				height={400}
				width={400}
				padding={{top: 0, bottom: 10, left: 120, right: 80}}
				data={data}
				style={{
					data: {
						transition: "transform .2s ease-in-out",
						fill,
						stoke: stroke,
						strokeWidth: series.data.length > 1 ? 2 : 0,
					},
				}}
				events={[
					{
						target: "data",
						eventHandlers: {
							onMouseOver: () => {
								return [{
									mutation: (props) => {
										return {
											style: Object.assign({}, props.style, {transform: "scale(1.1)"}),
										};
									},
								}];
							},
							onMouseOut: () => {
								this.setState({text: null});
								return [{
									mutation: () => null,
								}];
							},
						},
					},
				]}
			/>,
			<VictoryLegend data={legendData} width={100} height={400} padding={{top: 90}}/>,
			<VictoryLabel
				textAnchor="middle"
				verticalAnchor="middle"
				x={230}
				y={20}
				text={this.props.title}
				style={{
					fontSize: 20,
				}}
			/>
		</svg>;
	}
}
