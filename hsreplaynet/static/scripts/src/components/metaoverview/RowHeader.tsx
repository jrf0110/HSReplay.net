import * as React from "react";
import { ArchetypeData } from "../../interfaces";

interface RowHeaderProps extends React.ClassAttributes<RowHeader> {
	archetypeData?: ArchetypeData;
	isFavorite?: boolean;
	onClick: () => void;
}

interface RowHeaderState {
}

export default class RowHeader extends React.Component<RowHeaderProps, RowHeaderState> {
	render() {
		const style = this.props.isFavorite ? {background: "goldenrod"} : {};
		return (
			<th style={style} onClick={() => this.props.onClick()}>{this.props.archetypeData.name}</th>
		);
	}
}
