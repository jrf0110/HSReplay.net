import * as React from "react";
import { ArchetypeData } from "../../interfaces";

interface RowHeaderProps extends React.ClassAttributes<RowHeader> {
	archetypeData?: ArchetypeData;
	isFavorite?: boolean;
	onFavoriteClick: () => void;
}

interface RowHeaderState {
}

export default class RowHeader extends React.Component<RowHeaderProps, RowHeaderState> {
	render() {
		const favIconClasses = ["glyphicon glyphicon-star"];
		if (this.props.isFavorite) {
			favIconClasses.push("favorite");
		}

		return (
			<th
				className="matchup-row-header"
			>
				{this.props.archetypeData.name}
				<span
					className={favIconClasses.join(" ")}
					onClick={() => this.props.onFavoriteClick()}
				/>
			</th>
		);
	}
}
