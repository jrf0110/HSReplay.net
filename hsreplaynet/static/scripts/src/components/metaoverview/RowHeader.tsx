import * as React from "react";
import { ArchetypeData } from "../../interfaces";
import { getArchetypeUrl } from "../../helpers";
import Feature from "../Feature";

interface RowHeaderProps extends React.ClassAttributes<RowHeader> {
	archetypeData?: ArchetypeData;
	isFavorite?: boolean;
	onFavoriteClick: () => void;
}

interface RowHeaderState {
}

export default class RowHeader extends React.Component<RowHeaderProps, RowHeaderState> {
	render() {
		let activeFavIcon = null;
		const favIconClasses = ["glyphicon glyphicon-star favorite-toggle"];
		if (this.props.isFavorite) {
			favIconClasses.push("favorite");
			activeFavIcon = <span className="glyphicon glyphicon-star active-favorite"/>;
		}

		return (
			<th className="matchup-row-header">
				<div className="archetype" onClick={() => this.props.onFavoriteClick()}>
					<div className="class-icon-wrapper">
						<img
							className="class-icon"
							src={`${STATIC_URL}images/64x/class-icons/${this.props.archetypeData.playerClass.toLowerCase()}.png`}
						/>
						<span className={favIconClasses.join(" ")}/>
						{activeFavIcon}
					</div>
					{this.props.archetypeData.name}
				</div>
				<Feature feature="archetype-detail">
					<a
						href={getArchetypeUrl(this.props.archetypeData.id, this.props.archetypeData.name)}
						target="_blank"
					>
						<span className="glyphicon glyphicon-new-window"/>
					</a>
				</Feature>
			</th>
		);
	}
}
