import React from "react";
import { GameReplay } from "../../interfaces";
import { VictoryContainer, VictoryPie } from "victory";
import { getHeroColor, pieScaleTransform } from "../../helpers";

interface ClassDistributionPieChartState {
	hoveringSlice: any;
}

export interface ClassDistributionPieChartProps
	extends React.ClassAttributes<ClassDistributionPieChart> {
	data: any[];
	loading?: boolean;
	onPieceClicked?: (name: string) => void;
}

export default class ClassDistributionPieChart extends React.Component<
	ClassDistributionPieChartProps,
	ClassDistributionPieChartState
> {
	constructor(props: ClassDistributionPieChartProps) {
		super(props);
		this.state = {
			hoveringSlice: null
		};
	}

	render(): JSX.Element {
		let text = "";
		const data =
			this.props.data && this.props.data.length
				? this.props.data
				: [{ x: " ", y: 1, color: "lightgrey" }];
		const numGames =
			this.props.data && this.props.data.reduce((a, b) => a + b.y, 0);
		if (numGames && this.state.hoveringSlice) {
			text =
				this.state.hoveringSlice.xName +
				": " +
				this.state.hoveringSlice.y;
		} else {
			text = "Total: " + numGames;
		}
		const total = this.state.hoveringSlice
			? this.state.hoveringSlice.y
			: numGames;
		text += " game" + (!this.props.loading && total === 1 ? "" : "s");
		if (this.props.loading) {
			text += " [Loading…]";
		} else if (numGames) {
			let winrate = 0;
			if (this.state.hoveringSlice) {
				winrate = this.state.hoveringSlice.winrate;
			} else {
				let count = 0;
				data.forEach(d => {
					winrate += d.winrate * d.y;
					count += d.y;
				});
				winrate /= count;
			}
			text += " - " + Math.round(100.0 * winrate) + "% winrate";
		}

		const pieSize = 400;
		const padding = { top: 0, bottom: 10, left: 80, right: 80 };

		return (
			<div className="chart-wrapper">
				<VictoryPie
					containerComponent={<VictoryContainer title={""} />}
					data={data}
					style={{
						data: {
							fill: d => d.color || getHeroColor(d.xName),
							strokeWidth: 2,
							//transform: translate,
							transition: "transform .2s ease-in-out"
						},
						labels: { fill: "#FFFFFF", fontSize: 20 }
					}}
					padding={padding}
					padAngle={2}
					innerRadius={10}
					labels={d =>
						this.props.loading
							? null
							: Math.round(1000 / numGames * d.y) / 10 + "%"
					}
					events={[
						{
							target: "data",
							eventHandlers: {
								onMouseOver: () => {
									return [
										{
											mutation: props => {
												this.setState({
													hoveringSlice:
														props.slice.data
												});
												return {
													style: Object.assign(
														{},
														props.style,
														{
															stroke: "white",
															transform: pieScaleTransform(
																props,
																1.05
															)
														}
													)
												};
											}
										}
									];
								},
								onMouseOut: () => {
									this.setState({ hoveringSlice: null });
									return [
										{
											mutation: props => ({
												style: Object.assign(
													{},
													props.style,
													{ transform: null }
												)
											})
										}
									];
								},
								onClick: () => {
									if (this.props.onPieceClicked) {
										this.props.onPieceClicked(
											this.state.hoveringSlice.x.toLowerCase()
										);
									}
									return [
										{
											mutation: props => ({
												style: Object.assign(
													{},
													props.style,
													{ transform: null }
												)
											})
										}
									];
								}
							}
						}
					]}
				/>
				<h5 style={{ textAlign: "center", marginTop: "-20px" }}>
					{text}
				</h5>
			</div>
		);
	}
}
