import * as React from "react";
import {DeckObj, TableData, TableQueryData} from "../../interfaces";
import {isReady} from "../../helpers";
import CardData from "../../CardData";
import DeckList from "../DeckList";
import {getQueryMapDiff} from "../../QueryParser";

interface RecommendedDecksListProps extends React.ClassAttributes<RecommendedDecksList> {
	card: any;
	cardData: CardData;
	deckData: TableData;
	urlGameType: string;
}

export default class RecommendedDecksList extends React.Component<RecommendedDecksListProps, void> {
	render(): JSX.Element {
		if (!isReady(this.props.deckData)) {
			return <h3 className="message-wrapper">Loading...</h3>;
		}

		const decks: DeckObj[] = [];
		const data = (this.props.deckData as TableQueryData).series.data;
		Object.keys(data).forEach(playerClass => {
			const classDecks = [];
			data[playerClass].forEach(deck => {
				const cards = JSON.parse(deck["deck_list"]);
				if (cards.some(pair => pair[0] === this.props.card.dbfId)) {
					classDecks.push({cards, deck, numGames: +deck["total_games"]});
				}
			})
			classDecks.sort((a, b) => b.numGames - a.numGames);
			classDecks.slice(0, 10).forEach(deck => {
				const cardData = deck.cards.map(c => {return {card: this.props.cardData.fromDbf(c[0]), count: c[1]}});
				decks.push({
					cards: cardData,
					deckId: +deck.deck["deck_id"],
					duration: +deck.deck["avg_game_length_seconds"],
					numGames: +deck.deck["total_games"],
					playerClass: playerClass,
					winrate: +deck.deck["win_rate"]
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
