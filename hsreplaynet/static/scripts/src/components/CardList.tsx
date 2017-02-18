import * as React from "react";
import CardTile from "./CardTile";
import HDTButton from "./HDTButton";

interface CardListProps extends React.ClassAttributes<CardList> {
	cardDb: Map<string, any>;
	cards: string[];
	cardHeight?: number;
	rarityColored?: boolean;
	name: string;
	class: string;
	showButton?: boolean;
	id?: number;
}

export default class CardList extends React.Component<CardListProps, any> {
	public render(): JSX.Element {
		if (!this.props.cardDb) {
			return <div>Loading...</div>
		}
		let cardHeight = this.props.cardHeight ? this.props.cardHeight : 34;
		let cards = []
		this.getGroupedCards().forEach((count, id) => {
			let card = this.props.cardDb.get(id);
			if (card) {
				cards.push(<CardTile card={card} count={count} height={cardHeight} rarityColored={this.props.rarityColored} />);
			}
		});
		cards = cards.sort(this.sortBy("name")).sort(this.sortBy("cost"));
		return (
			<ul className="card-list">
				{cards}
				{this.props.showButton && cards.length > 0 && this.props.class ?
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

	getGroupedCards(): Map<string, number> {
		let map = new Map<string, number>();
		if (this.props.cards) {
			this.props.cards.forEach(c => map = map.set(c, (map.get(c) || 0) + 1));
		}
		return map;
	}

	sortBy(prop: string): any {
		return (a, b) => a.props.card[prop] > b.props.card[prop] ? 1 : -1;
	}
}
