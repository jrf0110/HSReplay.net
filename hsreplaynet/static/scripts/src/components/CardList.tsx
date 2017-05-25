import * as React from "react";
import CardTile from "./CardTile";
import {cardSorting} from "../helpers";
import CopyDeckButton from "./SwitchableCopyDeckButton";

interface CardListProps {
	cards: any;
	cardList: string[];
	cardHeight?: number;
	rarityColored?: boolean;
	name: string;
	heroes: number[];
	showButton?: boolean;
	id?: number;
	clickable?: boolean;
	deckClass?: string;
	format?: number;
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
			<div>
				<ul className="card-list">
					{cardTiles}
				</ul>
				{this.props.showButton && cardTiles.length > 0 && this.props.deckClass ?
					<div className="text-center copy-deck-wrapper">
						<CopyDeckButton
							cardIds={this.props.cardList}
							cards={this.props.cardList.map((id) => this.props.cards.byCardId[id].dbfId)}
							heroes={this.props.heroes}
							format={this.props.format}
							deckClass={this.props.deckClass}
							name={this.props.name}
							sourceUrl={window.location.toString()}
							id={"" + this.props.id}
						/>
					</div> : null}
			</div>
		);
	}
}
