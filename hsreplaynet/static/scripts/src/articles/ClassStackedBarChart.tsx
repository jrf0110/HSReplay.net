import React from "react";
import {
	VictoryAxis, VictoryBar, VictoryChart, VictoryContainer,
	VictoryLabel, VictoryStack, VictoryTooltip
} from "victory";

interface ClassData {
	key: string;
	druid: number;
	hunter: number;
	mage: number;
	paladin: number;
	priest: number;
	rogue: number;
	warlock: number;
	warrior: number;
}

interface ClassStackedBarChartState {
	legends?: Map<string, boolean>;
	offset?: number;
	data?: ClassData[];
}

interface ClassStackedBarChartProps {
	url: string;
	hideLegend?: boolean;
	hideControls?: boolean;
	numVisibleBars?: number;
}

export default class ClassStackedBarChart extends React.Component<ClassStackedBarChartProps, ClassStackedBarChartState> {
	private readonly keys = [
		"Druid", "Hunter", "Mage",
		"Paladin", "Priest", "Rogue",
		"Shaman", "Warlock", "Warrior"
	];

	constructor(props: ClassStackedBarChartProps, state: ClassStackedBarChartState) {
		super(props, state);
		this.state = {
			legends: new Map<string, boolean>(),
			offset: 0,
			data: null,
		}
		this.fetchData();
	}

	fetchData(): void{
		fetch(this.props.url).then((response: Response) => {
			return response.json();
		}).then((json: any) => {
			this.setState({data: json})
		});
	}

	render(): JSX.Element {
		if (!this.state.data) {
			return null;
		}

		const numBars = this.props.numVisibleBars || 15;
		const data = this.state.data.slice(this.state.offset, numBars + this.state.offset);
		const bars = [];

		this.keys.forEach(key => {
			if (this.isLegendSelected(key)) {
				const color = this.getColor(key);
				const tooltip = <VictoryTooltip
					dy={-4}
					cornerRadius={0}
					pointerLength={5}
					padding={1}
					flyoutStyle={{
						stroke: color,
						fill: "rgba(255, 255, 255, 0.85)"
					}}
				/>;
				bars.unshift(
					<VictoryBar
						name={"bar-" + key}
						x={"key"}
						y={key.toLowerCase()}
						data={data}
						style={{
							data: {fill: color, width: 200/data.length},
							labels: {fontSize: 6, padding: 5}
						}}
						labelComponent={tooltip}
						labels={x => x.key + "\n" + key + ": " + x[key.toLowerCase()]}
					/>
				);
			}
		});

		return <div className="chart stacked-bar-chart">
			<VictoryChart
				height={200}
				domainPadding={30}
				padding={{left: 50, right: 20, bottom: 70, top: 20}}
				containerComponent={<VictoryContainer title="" />}>
				<VictoryAxis
					tickValues={data.map(x => x.key)}
					tickLabelComponent={
						<VictoryLabel angle={270} dx={5} dy={-0.6} textAnchor="end"/>
					}
					style={{tickLabels: {fontSize: 6}}}
				/>
				<VictoryAxis
					dependentAxis
					style={{tickLabels: {fontSize: 6}, grid: {stroke: "gray"}}}
				/>
				<VictoryStack>
					{bars}
				</VictoryStack>
			</VictoryChart>
			<div className="legend-wrapper">
				{this.props.hideLegend ? null : this.buildLegend()}
			</div>
			<div className="controls-wrapper">
				{this.props.hideControls ? null :  this.buildControls(numBars)}
			</div>
		</div>
	}

	isLegendSelected(key: string): boolean {
		return !this.state.legends.has(key) || this.state.legends.get(key);
	}

	buildLegend(): JSX.Element[] {
		const legends = [];
		this.keys.forEach(key => {
			const selected = this.isLegendSelected(key);
			const labelStyle = selected ? {backgroundColor: this.getColor(key)} : null;
			legends.push(
				<span className="label" style={labelStyle}
					onClick={() => this.setState({legends: this.state.legends.set(key, !selected)})}>
					{key}
				</span>
			);

		})
		return legends;
	}

	buildControls(numBars: number): JSX.Element {
		const max = this.state.data.length - numBars;
		const currOffset = this.state.offset;
		const onClick = (cond: (offset: number) => boolean, newOffset: number) => {
			if (cond(this.state.offset)) {
				this.setState({offset: newOffset});
			}
		};
		const btnClassName = (disableAt: number): string => {
			return "btn" + (this.state.offset === disableAt ? " disabled" : "");
		}
		return <div className="btn-grnup">
			<button type="button"
				className={btnClassName(0)}
				onClick={() => onClick(x => x > 0, 0)}>
				<span className="glyphicon glyphicon-fast-backward"/>
			</button>
			<button type="button"
				className={btnClassName(0)}
				onClick={() => onClick(x => x > 0, this.state.offset - 1)}>
				<span className="glyphicon glyphicon-backward"/>
			</button>
			<button type="button"
				className={btnClassName(max)}
				onClick={() => onClick(x => x < max, this.state.offset + 1)}>
				<span className="glyphicon glyphicon-forward"/>
			</button>
			<button type="button"
				className={btnClassName(max)}
				onClick={() => onClick(x => x < max, max)}>
				<span className="glyphicon glyphicon-fast-forward"/>
			</button>
		</div>;
	}

	private getColor(hero: string): string {
		if (!hero) {
			return;
		}
		switch (hero.toUpperCase()) {
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
