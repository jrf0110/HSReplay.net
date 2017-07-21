import * as React from "react";
import { getHeroColor, hexToHsl, stringifyHsl, toTitleCase } from "../../helpers";
import { VictoryLabel, VictoryLegend, VictoryPie } from "victory";

interface ArchetypeDistributionPieChartProps extends React.ClassAttributes<ArchetypeDistributionPieChart> {
	matchupData?: any;
	archetypeData?: any;
	selectedArchetypeId?: string;
	playerClass: string;
}

const pageBackground: string = "#fbf7f6";

export default class ArchetypeDistributionPieChart extends React.Component<ArchetypeDistributionPieChartProps, void> {

	private getArchetypeName(archetypeId: string): string {
		const archetype = this.props.archetypeData.results.find((a) => a.id === archetypeId);
		return archetype ? archetype.name : `Other ${toTitleCase(this.props.playerClass)}`;
	}

	private getChartData(): any {
		const archetypes = this.props.matchupData.series.data[this.props.playerClass];
		const data = archetypes.map((archetype) => {
			const id = archetype.archetype_id;
			const selected = id === this.props.selectedArchetypeId;
			return {
				isSelectedArchetype: id === this.props.selectedArchetypeId,
				stroke: pageBackground,
				strokeWidth: selected ? 2 : 0,
				transform: selected ? "scale(1.1)" : "scale(1.0)",
				x: this.getArchetypeName(id),
				y: archetype.pct_of_class,
			};
		});
		data.sort((a, b) => b.y - a.y);

		const baseColorHex = getHeroColor(this.props.playerClass);
		const baseHsl = hexToHsl(baseColorHex);

		// spread colors across lightness, weighted towards center with fewer items
		const margin = 10 + Math.max(0, 10 - data.length) * 3;
		const stride = (100 - 2 * margin) / (data.length - 1);

		const coloredData = data.map((p, index) => {
			return Object.assign(p, {fill: stringifyHsl(baseHsl[0], baseHsl[1], Math.floor(margin + index * stride))});
		});
		return coloredData;
	}

	render(): JSX.Element {
		const data = this.getChartData();
		const legendData = data.map((p) => {
			return {
				name: p.x,
				symbol: {style: "circle", fill: p.fill},
			};
		});

		return (
			<svg viewBox="0 0 400 600">
				<VictoryPie
					labels={(d) => {
						if (d.y >= 5 || d.isSelectedArchetype) {
							return (d.y).toFixed(1) + "%";
						}
					}}
					height={400}
					width={400}
					padding={{top: 10, bottom: 10, left: 80, right: 80}}
					data={data}
					style={{
						data: {
							fill: (prop) => prop.fill,
							stroke: (prop) => prop.stroke,
							style: (prop) => {
								return {
									strokeWidth: prop.strokeWidth,
									transform: prop.transform,
								};
							},
						},
					}}
				/>
				<VictoryLegend data={legendData} width={400} height={600} padding={{top: 360, left: 80}} />
				<VictoryLabel
					textAnchor="middle"
					verticalAnchor="middle"
					x={200}
					y={20}
					text={`${toTitleCase(this.props.playerClass)} Archetypes`}
					style={{ fontSize: 20 }}
				/>
			</svg>
		);
	}
}
