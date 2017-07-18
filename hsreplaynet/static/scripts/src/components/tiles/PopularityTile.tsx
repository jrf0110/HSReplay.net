import * as React from "react";
import * as _ from "lodash";
import {AutoSizer} from "react-virtualized";
import { toTitleCase } from "../../helpers";
import PopularityLineChart from "./PopularityLineChart";

interface PopularityTileState {
	popularity?: number;
}

interface PopularityTileProps extends React.ClassAttributes<PopularityTile> {
	archetypeId?: number;
	chartData?: any;
	popularityData?: any;
	playerClass: string;
}

export default class PopularityTile extends React.Component<PopularityTileProps, PopularityTileState> {
	constructor(props: PopularityTileProps, state: PopularityTileState) {
		super(props, state);
		this.state = {
			popularity: 0,
		};
	}

	componentWillReceiveProps(nextProps: PopularityTileProps) {
		if (nextProps.popularityData && !_.isEqual(this.props.popularityData, nextProps.popularityData)) {
			const classData = nextProps.popularityData.series.data[this.props.playerClass];
			const archetype = classData && classData.find((a) => a.archetype_id === this.props.archetypeId);
			if (archetype) {
				this.setState({popularity: archetype.pct_of_class});
			}
		}
	}

	render(): JSX.Element {
		let chart = null;
		if (this.props.chartData) {
			chart = (
				<AutoSizer>
					{({width}) => (
						<PopularityLineChart
							data={this.props.chartData}
							height={50}
							width={width}
						/>
					)}
				</AutoSizer>
			);
		}
		return (
			<div className="col-xs-12 col-sm-6 col-md-4 col-lg-3">
				<div className="tile popularity-tile">
					<div className="tile-title">
						Popularity
					</div>
					<div className="tile-content">
						<h1>{this.state.popularity}%</h1>
						<h3>of {toTitleCase(this.props.playerClass)} decks</h3>
					</div>
					<div className="tile-chart">
						{chart}
					</div>
				</div>
			</div>
		);
	}
}
