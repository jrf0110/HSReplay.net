import * as React from "react";
import CardData from "../../CardData";
import {CardObj, DeckObj, TableData} from "../../interfaces";
import DeckList from "../DeckList";

interface SimilarDecksListProps extends React.ClassAttributes<SimilarDecksList> {
	cardData?: CardData;
	data?: TableData;
	playerClass: string;
	rawCardList: string;
	wildDeck: boolean;
}

export default class SimilarDecksList extends React.Component<SimilarDecksListProps, void> {
	render(): JSX.Element {
		const dbfIds = this.props.rawCardList.split(",");

		const deckList = {};
		dbfIds.forEach((dbfId) => deckList[dbfId] = (deckList[dbfId] || 0) + 1);

		const byDistance = [];

		const classDecks = this.props.data.series.data[this.props.playerClass];
		let maxDistance = 3;
		while (maxDistance < 6 && byDistance.length < 20) {
			classDecks.forEach((deck) => {
				let distance = 0;
				const cards = JSON.parse(deck["deck_list"]);
				cards.forEach((pair) => {
					distance += Math.abs(pair[1] - (deckList[pair[0]] || 0));
				});
				if (distance > 1 && distance < maxDistance) {
					byDistance.push({cards, deck, distance, numGames: +deck["total_games"]});
				}
			});
			maxDistance++;
		}

		if (!byDistance.length) {
			return <h3 className="message-wrapper">No decks found.</h3>;
		}

		byDistance.sort((a, b) => b.numGames - a.numGames);

		const decks: DeckObj[] = [];
		byDistance.slice(0, 20).forEach((deck) => {
			const cardData = deck.cards.map((c) => {return {card: this.props.cardData.fromDbf(c[0]), count: c[1]}; });
			decks.push({
				cards: cardData,
				deckId: deck.deck["deck_id"],
				duration: +deck.deck["avg_game_length_seconds"],
				numGames: +deck.deck["total_games"],
				playerClass: this.props.playerClass,
				winrate: +deck.deck["win_rate"],
			});
		});

		const cards: CardObj[] = [];
		dbfIds.forEach((dbfId) => {
			const card = this.props.cardData.fromDbf(dbfId);
			const existing = cards.find((c) => c.card.dbfId === +dbfId);
			if (existing) {
				existing.count += 1;
			}
			else {
				cards.push({card, count: 1});
			}
		});

		return (
			<DeckList
				decks={decks}
				pageSize={10}
				hideTopPager
				compareWith={cards}
				urlGameType={this.props.wildDeck && "RANKED_WILD"}
			/>
		);
	}
}
