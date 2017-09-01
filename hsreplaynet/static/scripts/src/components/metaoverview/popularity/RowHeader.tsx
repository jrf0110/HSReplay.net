import * as React from "react";
import { getArchetypeUrl } from "../../../helpers";
import Feature from "../../Feature";
import Tooltip from "../../Tooltip";
import DataInjector from "../../DataInjector";
import CardData from "../../../CardData";
import { ArchetypeRankPopularity } from "../../../interfaces";
import ArchetypeSignature from "../../archetypedetail/ArchetypeSignature";
import ArchetypeSignatureTooltip from "../ArchetypeSignatureTooltip";

interface RowHeaderProps extends React.ClassAttributes<RowHeader> {
	archetypeData?: ArchetypeRankPopularity;
	cardData: CardData;
	gameType: string;
	style?: any;
}

interface RowHeaderState {
}

export default class RowHeader extends React.Component<RowHeaderProps, RowHeaderState> {
	render() {
		return (
			<div className="matchup-row-header" style={this.props.style}>
				<div className="archetype">
					<div className="class-icon-wrapper">
						<img
							className="class-icon"
							src={`${STATIC_URL}images/64x/class-icons/${this.props.archetypeData.playerClass.toLowerCase()}.png`}
						/>
					</div>
					{this.props.archetypeData.name}
				</div>
				<Feature feature="archetype-detail">
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
							<span className="glyphicon glyphicon-new-window"/>
						</ArchetypeSignatureTooltip>
					</a>
				</Feature>
			</div>
		);
	}
}
