import * as React from "react";
import {VictoryContainer, VictoryLabel, VictoryLegend, VictoryPie} from "victory";
import { getChartScheme, getPieTranslate, toTitleCase } from "../../helpers";
import {ChartScheme, RenderData} from "../../interfaces";

interface CardDetailPieChartProps {
	data?: RenderData;
	title?: string;
	scheme?: ChartScheme;
	sortByValue?: boolean;
	removeEmpty?: boolean;
	groupSparseData?: boolean;
	percentage?: boolean;
	customViewbox?: string;
}

export default class CardDetailPieChart extends React.Component<CardDetailPieChartProps, void> {
	private readonly pieSize = 400;

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

			if (this.props.groupSparseData) {
				let remaining = 0;
				let filtered = 0;
				const filteredData = data.filter((a) => {
					const value = +a.y;
					if (value <= 5) {
						remaining += value;
						filtered++;
						return false;
					}
					return true;
				});
				if (filtered > 0) {
					if (remaining > 0) {
						filteredData.push({
							x: "other",
							y: remaining,
						});
					}
					data = filteredData;
				}
			}
		}

		if (this.props.sortByValue) {
			data = data.sort((a, b) => {
				let o = [a.x, b.x].indexOf("other");
				if (o !== -1) {
					return -2 * o + 1;
				}
				return a.y > b.y ? -1 : 1;
			});
		}

		if (scheme) {
			data.forEach((d) => {
				legendData.push(
					{name: toTitleCase("" + d.x), symbol: {type: "circle", fill: scheme[("" + d.x).toLowerCase()].stroke}},
				);
			});
		}

		const padding = {top: 0, bottom: 10, left: 120, right: 90};
		const transform = getPieTranslate(this.pieSize, this.pieSize, padding);

		return <svg viewBox={this.props.customViewbox || "0 0 400 400"}>
			<VictoryPie
				containerComponent={<VictoryContainer title="" />}
				animate={{duration: 300}}
				labels={(d) => {
					if (d.x === "other" && this.props.percentage) {
						return "<" + (d.y).toFixed(0) + "%";
					}
					return this.props.percentage ? ((d.y).toFixed(1) + "%") : d.y;
				}}
				height={this.pieSize}
				width={this.pieSize}
				padding={padding}
				data={data}
				style={{
					data: {
						transform,
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
											style: Object.assign({}, props.style, {transform: transform + " scale(1.1)"}),
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
			{this.props.title ? <VictoryLabel
				textAnchor="middle"
				verticalAnchor="middle"
				x={230}
				y={20}
				text={this.props.title}
				style={{
					fontSize: 20,
				}}
			/> : null}
		</svg>;
	}
}
