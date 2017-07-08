import * as React from "react";
import { ArchetypeData } from "../../interfaces";

interface ColumnHeaderProps extends React.ClassAttributes<ColumnHeader> {
	archetypeData: ArchetypeData;
	isIgnored: boolean;
}

interface ColumnHeaderState {
}

export default class ColumnHeader extends React.Component<ColumnHeaderProps, ColumnHeaderState> {
	render() {
		return (
			<th>{this.props.archetypeData.name}</th>
		);
	}
}
