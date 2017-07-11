import * as React from "react";
import { ArchetypeData } from "../../interfaces";

interface ColumnHeaderProps extends React.ClassAttributes<ColumnHeader> {
	archetypeData: ArchetypeData;
	isIgnored: boolean;
	onIgnoredChanged: (ignore: boolean) => void;
}

interface ColumnHeaderState {
}

export default class ColumnHeader extends React.Component<ColumnHeaderProps, ColumnHeaderState> {
	render() {
		const classNames = ["matchup-column-header"];
		if (this.props.isIgnored) {
			classNames.push("ignored");
		}
		return (
			<div
				className={classNames.join(" ")}
				onClick={() => this.props.onIgnoredChanged(!this.props.isIgnored)}
			>
				{this.props.archetypeData.name}
				<img
					className="class-icon"
					src={`${STATIC_URL}images/64x/class-icons/${this.props.archetypeData.playerClass.toLowerCase()}.png`}
				/>
			</div>
		);
	}
}
