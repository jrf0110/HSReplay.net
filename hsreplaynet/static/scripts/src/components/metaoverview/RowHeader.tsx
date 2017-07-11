import * as React from "react";
import { ArchetypeData } from "../../interfaces";
import { getArchetypeUrl } from "../../helpers";
import Feature from "../Feature";
import Tooltip from "../Tooltip";
import DataInjector from "../DataInjector";
import CardData from "../../CardData";
import ArchetypeCardList from "./ArchetypeCardList";

interface RowHeaderProps extends React.ClassAttributes<RowHeader> {
	archetypeData?: ArchetypeData;
	cardData: CardData;
	isFavorite?: boolean;
	onFavoriteChanged: (favorite: boolean) => void;
	style?: any;
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
			<div className="matchup-row-header" style={this.props.style}>
				<div className="archetype" onClick={() => this.props.onFavoriteChanged(!this.props.isFavorite)}>
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
						<Tooltip content={this.getTooltip()} header={this.props.archetypeData.name}>
							<span className="glyphicon glyphicon-new-window"/>
						</Tooltip>
					</a>
				</Feature>
			</div>
		);
	}

	getTooltip(): JSX.Element {
		return (
			<DataInjector
				query={{key: "deckData", params: {}, url: "list_decks_by_win_rate"}}
			>
				<ArchetypeCardList
					cardData={this.props.cardData}
					archetypeId={this.props.archetypeData.id}
					playerClass={this.props.archetypeData.playerClass}
				/>
			</DataInjector>
		);
	}
}
