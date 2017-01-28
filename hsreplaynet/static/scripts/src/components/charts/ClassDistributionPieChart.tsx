import * as React from "react";
import { GameReplay } from "../../interfaces";
import { VictoryPie } from "victory";

interface ClassDistributionPieChartState {
	name?: string;
	value?: number;
	pct?: string;
}

export interface ClassDistributionPieChartProps extends React.ClassAttributes<ClassDistributionPieChart>{
	data: any[];
	loading?: boolean;
	onPieceClicked?: (name: string) => void;
	stroke?: string;
	hoverStroke?: string;
	fontColor?: string;
	strokeWidth?: number;
}


export default class ClassDistributionPieChart extends React.Component<ClassDistributionPieChartProps, ClassDistributionPieChartState> {
	constructor() {
		super();
		this.state = {
			name: "",
			value: 0,
			pct: "",
		}
	}
	render(): JSX.Element {
		const numGames = this.props.data.map(x => x.y).reduce((a, b) => a + b, 0);
		return (
			<div>
				<VictoryPie
					data={this.props.data}
					style={{
						data: {fill: d => d.color, strokeWidth: this.props.strokeWidth || 2, stroke: this.props.stroke, transition: "transform .2s ease-in-out"},
						labels: {fill: this.props.fontColor, fontSize: 20},
					}}
					padding={{top: 70, bottom: 10, left: 80, right: 80}}
					padAngle={2}
					innerRadius={10}
					events={[{
						target: "data",
						eventHandlers: {
							onMouseOver: () => {
								return [{
									mutation: (props) => {
										this.setState({name: props.style.name, value: props.slice.value, pct: props.style.xName});
										return {
											style: Object.assign({}, props.style, {stroke: this.props.hoverStroke || this.props.stroke, transform: "scale(1.05)"})
										};
									}
								}]
							},
							onMouseOut: () => {
								this.setState({name: null})
								return [{
									mutation: () => null
								}];
							},
							onClick: () => {
								if (this.props.onPieceClicked) {
									this.props.onPieceClicked(this.state.name.toLowerCase());
								}
								return [{
									mutation: () => null
								}];
							}
						}
					}]}
				/>
				<h5 style={{textAlign: "center", marginTop: "-20px"}}>
					{(numGames && this.state.name ? this.state.name + ": " + this.state.value : "Total: " + numGames) + " Games" + (this.props.loading ? " [Loading...]" : "")}
				</h5>
			</div>
		);
	}
}
