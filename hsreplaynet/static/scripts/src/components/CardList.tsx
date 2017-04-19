import * as React from "react";
import CardTile from "./CardTile";
import HDTButton from "./HDTButton";
import {cardSorting} from "../helpers";

interface CardListProps {
	cards: any;
	cardList: string[];
	cardHeight?: number;
	rarityColored?: boolean;
	name: string;
	deckClass?: string;
	showButton?: boolean;
	id?: number;
	clickable?: boolean;
}

export default class CardList extends React.Component<CardListProps, any> {
	public render(): JSX.Element {
		if (!this.props.cardList) {
			return null;
		}
		if (!this.props.cards) {
			return <div>Loading…</div>;
		}

		const cardHeight = this.props.cardHeight ? this.props.cardHeight : 34;
		const counts = {};
		this.props.cardList.forEach((id) => counts[id] = (counts[id] || 0) + 1);

		const cards = Object.keys(counts).map((id) => this.props.cards.byCardId[id]);
		cards.sort(cardSorting);

		const cardTiles = [];
		cards.forEach((card) => {
			if (card) {
				cardTiles.push(
					<CardTile
						card={card}
						count={counts[card.id]}
						height={cardHeight}
						rarityColored={this.props.rarityColored}
						noLink={!this.props.clickable}
					/>,
				);
			}
		});

		return (
			<ul className="card-list">
				{cardTiles}
				{this.props.showButton && cardTiles.length > 0 && this.props.deckClass ?
					<HDTButton
						card_ids={this.props.cardList}
						name={this.props.name}
						deckClass={this.props.deckClass}
						sourceUrl={window.location.toString()}
						id={this.props.id}
				/> : null}
			</ul>
		);
	}
}
