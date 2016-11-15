import * as React from "react";
import CardTile from "./CardTile"

interface DeckListProps extends React.ClassAttributes<DeckList> {
	cardDb: Map<string, any>;
	cards: Map<string, number>;
	cardHeight?: number;
}

export default class DeckList extends React.Component<DeckListProps, any> {
	public render(): JSX.Element {
		if (!this.props.cardDb) {
			return <div>Loading...</div>
		}
		let cardHeight = this.props.cardHeight ? this.props.cardHeight : 34;
		let cards = []
		this.props.cards.forEach((count, id) => {
			let card = this.props.cardDb.get(id);
			if (card) {
				cards.push(<CardTile card={card} count={count} height={cardHeight} />);
			}
		});
		cards = cards.sort(this.sortBy("name")).sort(this.sortBy("cost"));
		return <ul>{cards}</ul>;
	}

	sortBy(prop: string): any {
		return (a, b) => a.props.card[prop] > b.props.card[prop] ? 1 : -1;
	}
}
