import * as React from "react";
import { DeckObj } from "../../interfaces";
import DeckList from "../DeckList";
import Fragments from "../Fragments";

interface DeckCountersListProps extends React.ClassAttributes<DeckCountersList> {
	deckData?: any;
	cardData?: any;
	countersData?: any;
	playerClass: string;
}

export default class DeckCountersList extends React.Component<DeckCountersListProps, void> {

	render(): JSX.Element {
		const decks: DeckObj[] = [];
		this.props.countersData.series.data[this.props.playerClass].forEach((data) => {
			const deck = this.findDeck(data.deck_id);
			if (deck) {
				const cards = JSON.parse(deck.deck_list);
				const cardData = cards.map((c) => {return {card: this.props.cardData.fromDbf(c[0]), count: c[1]}; });

				// This is currently using global stats for everything but the winrate
				decks.push({
					cards: cardData,
					deckId: deck.deck_id,
					duration: +deck.avg_game_length_seconds,
					numGames: +deck.total_games,
					playerClass: deck.playerClass,
					winrate: (100 - data.win_rate),
				});
			}
		});

		return (
			<Fragments
				defaults={{
					sortBy: "popularity",
					sortDirection: "descending",
				}}
			>
				<DeckList
					decks={decks}
					pageSize={10}
					hideTopPager
				/>
			</Fragments>
		);
	}

	findDeck(deckId: string): any {
		const data = this.props.deckData.series.data;
		let deck = null;
		Object.keys(data).find((playerClass) => {
			const found = data[playerClass].find((d) => d.deck_id === deckId);
			if (found) {
				found.playerClass = playerClass;
				deck = found;
				return true;
			}
		});
		return deck;
	}
}
