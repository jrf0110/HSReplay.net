import * as React from "react";
import CardData from "../../CardData";
import {DeckObj, TableData} from "../../interfaces";
import DeckList from "../DeckList";

interface RecommendedDecksListProps extends React.ClassAttributes<RecommendedDecksList> {
	card: any;
	cardData: CardData;
	data?: TableData;
	urlGameType: string;
}

export default class RecommendedDecksList extends React.Component<RecommendedDecksListProps, void> {
	render(): JSX.Element {
		const decks: DeckObj[] = [];
		const data = this.props.data.series.data;
		Object.keys(data).forEach((playerClass) => {
			const classDecks = [];
			data[playerClass].forEach((deck) => {
				const cards = JSON.parse(deck["deck_list"]);
				if (cards.some((pair) => pair[0] === this.props.card.dbfId)) {
					classDecks.push({cards, deck, numGames: +deck["total_games"]});
				}
			});
			classDecks.sort((a, b) => b.numGames - a.numGames);
			classDecks.slice(0, 10).forEach((deck) => {
				const cardData = deck.cards.map((c) => {return {card: this.props.cardData.fromDbf(c[0]), count: c[1]};});
				decks.push({
					cards: cardData,
					deckId: deck.deck["deck_id"],
					duration: +deck.deck["avg_game_length_seconds"],
					numGames: +deck.deck["total_games"],
					playerClass,
					winrate: +deck.deck["win_rate"],
				});
			});
		});

		if (!decks.length) {
			return <h3 className="message-wrapper">No decks found.</h3>;
		}

		decks.sort((a, b) => b.numGames - a.numGames);

		return (
			<DeckList
				decks={decks}
				pageSize={10}
				hideTopPager
				urlGameType={this.props.urlGameType}
			/>
		);
	}
}
