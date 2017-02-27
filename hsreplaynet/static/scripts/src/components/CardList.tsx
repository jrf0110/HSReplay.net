import * as React from "react";
import CardTile from "./CardTile";
import HDTButton from "./HDTButton";
import {cardSorting} from "../helpers";

interface CardListProps extends React.ClassAttributes<CardList> {
	cardDb: Map<string, any>;
	cards: string[];
	cardHeight?: number;
	rarityColored?: boolean;
	name: string;
	class: string;
	showButton?: boolean;
	id?: number;
	clickable?: boolean;
}

export default class CardList extends React.Component<CardListProps, any> {
	public render(): JSX.Element {
		if (!this.props.cards) {
			return null;
		}
		if (!this.props.cardDb) {
			return <div>Loading...</div>
		}

		const cardHeight = this.props.cardHeight ? this.props.cardHeight : 34;
		const counts = {};
		this.props.cards.forEach(id => counts[id] = (counts[id] || 0) + 1);

		const cards = Object.keys(counts).map(id => this.props.cardDb.get(id));
		cards.sort(cardSorting);

		const cardTiles = [];
		cards.forEach(card => {
			if (!card) {
				return;
			}
			let tile = <CardTile card={card} count={counts[card.id]} height={cardHeight} rarityColored={this.props.rarityColored} />;
			if (this.props.clickable) {
				tile = <a href={"/cards/" + card.dbfId + "/"}>{tile}</a>
			}
			cardTiles.push(tile);
		});
		
		return (
			<ul className="card-list">
				{cardTiles}
				{this.props.showButton && cardTiles.length > 0 && this.props.class ?
					<HDTButton
						card_ids={this.props.cards}
						name={this.props.name}
						class={this.props.class}
						sourceUrl={window.location.toString()}
						id={this.props.id}
				/> : null}
			</ul>
		);
	}
}
