import * as React from "react";
import Bar, {BarDirection} from "./Bar";
import {ArchetypeData} from "../../interfaces";

interface ColumnFooterProps extends React.ClassAttributes<ColumnFooter> {
	archetypeData: ArchetypeData;
}

interface ColumnFooterState {
}

export default class ColumnFooter extends React.Component<ColumnFooterProps, ColumnFooterState> {
	render() {
		return (
			<td>
				<Bar
					total={100}
					value={this.props.archetypeData.popularityClass}
					direction={BarDirection.VERTICAL}
					label={`${this.props.archetypeData.popularityClass}%`}
				/>
			</td>
		);
	}
}
