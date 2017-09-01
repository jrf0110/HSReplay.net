import * as React from "react";
import * as _ from "lodash";
import { ArchetypeData } from "../../../interfaces";
import { getArchetypeUrl } from "../../../helpers";
import Feature from "../../Feature";
import Tooltip from "../../Tooltip";
import DataInjector from "../../DataInjector";
import CardData from "../../../CardData";
import ArchetypeSignature from "../../archetypedetail/ArchetypeSignature";
import ArchetypeSignatureTooltip from "../ArchetypeSignatureTooltip";

interface RowHeaderProps extends React.ClassAttributes<RowHeader> {
	archetypeData?: ArchetypeData;
	cardData: CardData;
	gameType: string;
	highlight?: boolean;
	isFavorite?: boolean;
	onFavoriteChanged: (favorite: boolean) => void;
	onHover?: (hovering: boolean) => void;
	style?: any;
}

export default class RowHeader extends React.Component<RowHeaderProps, {}> {
	shouldComponentUpdate(nextProps: RowHeaderProps): boolean {
		return (
			this.props.highlight !== nextProps.highlight
			|| this.props.isFavorite !== nextProps.isFavorite
			|| this.props.archetypeData.id !== nextProps.archetypeData.id
			|| !_.isEqual(this.props.style, nextProps.style)
		);
	}

	render() {
		let activeFavIcon = null;
		const favIconClasses = ["glyphicon glyphicon-star favorite-toggle"];
		if (this.props.isFavorite) {
			favIconClasses.push("favorite");
			activeFavIcon = <span className="glyphicon glyphicon-star active-favorite"/>;
		}
		const classNames = ["matchup-row-header"];
		if (this.props.highlight) {
			classNames.push("highlight");
		}

		return (
			<div
				className={classNames.join(" ")}
				style={this.props.style}
				onMouseEnter={() => this.props.onHover(true)}
				onMouseLeave={() => this.props.onHover(false)}
			>
				<div className="archetype matchup-archetype">
					<div className="class-icon-wrapper" onClick={() => this.props.onFavoriteChanged(!this.props.isFavorite)}>
						<img
							className="class-icon"
							src={`${STATIC_URL}images/64x/class-icons/${this.props.archetypeData.playerClass.toLowerCase()}.png`}
						/>
						<span className={favIconClasses.join(" ")}/>
						{activeFavIcon}
					</div>
					<a
						href={getArchetypeUrl(this.props.archetypeData.id, this.props.archetypeData.name)}
						target="_blank"
					>
						<ArchetypeSignatureTooltip
							key={this.props.archetypeData.id}
							cardData={this.props.cardData}
							archetypeId={this.props.archetypeData.id}
							archetypeName={this.props.archetypeData.name}
							gameType={this.props.gameType}
						>
							<span className="archetype-name">{this.props.archetypeData.name}</span>
						</ArchetypeSignatureTooltip>
					</a>
				</div>
			</div>
		);
	}
}
