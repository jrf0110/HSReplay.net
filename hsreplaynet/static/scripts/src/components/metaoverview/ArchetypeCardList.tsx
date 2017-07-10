import * as React from "react";
import CardData from "../../CardData";
import CardList from "../CardList";

interface ArchetypeCardListProps extends React.ClassAttributes<ArchetypeCardList> {
	cardData?: CardData;
	deckData?: any;
	playerClass: string;
	archetypeId: number;
}

export default class ArchetypeCardList extends React.Component<ArchetypeCardListProps, void> {
	render(): JSX.Element {
		if (!this.props.deckData || !this.props.cardData) {
			return <div className="text-center">Loading...</div>;
		}
		const deck = this.props.deckData.series.data[this.props.playerClass].find((d)  => {
			return d.archetype_id === this.props.archetypeId;
		});
		if (!deck) {
			return <div className="text-center">No deck found :(</div>;
		}
		const cards = [];
		JSON.parse(deck.deck_list).forEach((card) => {
			for (let i = 0; i < card[1]; i++) {
				cards.push(card[0]);
			}
		});
		return (
			<CardList
				cardData={this.props.cardData}
				cardList={cards}
				heroes={[]}
				name=""
			/>
		);
	};
}
