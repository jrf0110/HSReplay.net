import * as React from "react";
import { ArchetypeData } from "../../interfaces";

interface RowHeaderProps extends React.ClassAttributes<RowHeader> {
	archetypeData?: ArchetypeData;
}

interface RowHeaderState {
}

export default class RowHeader extends React.Component<RowHeaderProps, RowHeaderState> {
	render() {
		return (
			<th>{this.props.archetypeData.name}</th>
		);
	}
}
