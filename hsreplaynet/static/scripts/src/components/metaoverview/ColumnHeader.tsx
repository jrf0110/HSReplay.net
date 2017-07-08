import * as React from "react";
import { ArchetypeData } from "../../interfaces";

interface ColumnHeaderProps extends React.ClassAttributes<ColumnHeader> {
	archetypeData: ArchetypeData;
	isIgnored: boolean;
	onIgnoredChanged: (archetypeId: number) => void;
}

interface ColumnHeaderState {
}

export default class ColumnHeader extends React.Component<ColumnHeaderProps, ColumnHeaderState> {
	render() {
		const style = this.props.isIgnored ? {background: "lightgray"} : {};
		return (
			<th style={style} onClick={() => this.props.onIgnoredChanged(this.props.archetypeData.id)}>{this.props.archetypeData.name}</th>
		);
	}
}
