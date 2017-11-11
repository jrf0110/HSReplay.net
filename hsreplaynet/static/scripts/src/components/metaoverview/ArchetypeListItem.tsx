import * as React from "react";
import {ApiArchetype, ApiArchetypePopularity} from "../../interfaces";
import CardData from "../../CardData";
import {getHeroCardId, toDynamicFixed, winrateData} from "../../helpers";
import ArchetypeClassTable from "./ArchetypeClassTable";
import CardIcon from "../CardIcon";

interface ArchetypeListItemProps extends React.ClassAttributes<ArchetypeListItem> {
	archetype: ApiArchetypePopularity;
	archetypeData: ApiArchetype[];
	cardData: CardData;
	data?: ApiArchetype;
	deckData?: any;
}

export default class ArchetypeListItem extends React.Component<ArchetypeListItemProps, {}> {
	render(): JSX.Element {
		const archetype = this.props.archetypeData.find((a) => a.id === this.props.archetype.archetype_id);
		const imgUrl = `/static/images/64x/class-icons/${archetype.player_class_name.toLowerCase()}.png`;
		const coreCards = [];

		const {cardData} = this.props;
		archetype.standard_ccp_signature_core.components.forEach((dbfId) => {
			coreCards.push(<li><CardIcon card={cardData.fromDbf(dbfId)}/></li>);
		});

		const {color} = winrateData(50, this.props.archetype.win_rate, 3);
		const hero = getHeroCardId(archetype.player_class_name, true);
		const backgroundImage = `url(https://art.hearthstonejson.com/v1/256x/${hero}.jpg)`;

		const deck = this.props.deckData[archetype.player_class_name]
			.filter((d) => d.archetype_id === archetype.id)
			.sort((a, b) => b.total_games - a.total_games)[0];

		return (
			<li
				className="archetype-list-item"
				style={{backgroundImage}}
			>
				<a href={archetype.url}>
					<div className="archetype-header col-sm-12 col-md-3">
						<img className="archetype-icon" src={imgUrl}/>
						<div className="archetype-info">
							<div className="archetype-name">
								{archetype.name}
							</div>
							<div className="foo">
								<div className="archetype-data" style={{color}}>
									{toDynamicFixed(this.props.archetype.win_rate, 2)}%
								</div>
							</div>
						</div>
					</div>
					<div className="archetype-cards col-xs-12 col-md-5">
						<span className="archetype-cards-header">Core cards</span>
						<ul className="archetype-card-list">
							{coreCards.slice(0, 8)}
						</ul>
					</div>
					<div className="col-xs-12 col-md-4">
						<a className="btn btn-primary btn-deck" href={`/decks/${deck.deck_id}`}>
							View most popular deck
						</a>
					</div>
					<div className="clearfix"/>
				</a>
			</li>
		);
	}

}
