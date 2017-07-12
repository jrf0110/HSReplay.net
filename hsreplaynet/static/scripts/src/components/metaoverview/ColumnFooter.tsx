import * as React from "react";
import Bar, {BarDirection} from "./Bar";
import {ArchetypeData} from "../../interfaces";

interface ColumnFooterProps extends React.ClassAttributes<ColumnFooter> {
	archetypeData: ArchetypeData;
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
					total={100}
					value={this.props.archetypeData.popularityClass}
					direction={BarDirection.VERTICAL}
					label={`${this.props.archetypeData.popularityClass}%`}
				/>
			</div>
		);
	}
}
