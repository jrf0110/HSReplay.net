import * as React from "react";
import Bar, {BarDirection} from "./Bar";
import {ArchetypeData} from "../../interfaces";

interface ColumnFooterProps extends React.ClassAttributes<ColumnFooter> {
	archetypeData: ArchetypeData;
	max?: number;
	style?: any;
}

export default class ColumnFooter extends React.Component<ColumnFooterProps, {}> {
	render() {
		return (
			<div
				className="matchup-column-footer"
				style={this.props.style}
			>
				<Bar
					total={this.props.max ? this.props.max : 100}
					value={this.props.archetypeData.popularityTotal}
					direction={BarDirection.VERTICAL}
					label={`${this.props.archetypeData.popularityTotal}%`}
				/>
			</div>
		);
	}
}
