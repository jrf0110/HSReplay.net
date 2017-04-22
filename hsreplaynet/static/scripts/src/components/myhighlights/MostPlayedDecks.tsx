import * as React from "react";
import CardData from "../../CardData";
import { DeckObj, MyDecks } from "../../interfaces";
import DeckList from "../DeckList";

interface MostPlayedDecksProps {
	cardData?: CardData;
	data?: MyDecks;
}

export default class MostPlayedDecks extends React.Component<MostPlayedDecksProps, void> {
	render(): JSX.Element {
			const decks: DeckObj[] = [];
			Object.keys(this.props.data).forEach((id) => {
				const deck = this.props.data[id];
				const gameTypes = Object.keys(deck.game_types);
				if (gameTypes.indexOf("BGT_RANKED_STANDARD") !== -1 || gameTypes.indexOf("BGT_RANKED_WILD") !== -1) {
					const cards = deck["deck_list"];
					const deckList = cards.map((c) => {return {card: this.props.cardData.fromDbf(c[0]), count: c[1]}; });
					decks.push({
						cards: deckList,
						deckId: deck.deck_id,
						duration: deck.avg_game_length_seconds,
						numGames: deck.total_games,
						playerClass: deck.player_class,
						winrate: deck.win_rate * 100,
					});
				}
			});

			if (decks.length) {
				decks.sort((a, b) => b.numGames - a.numGames);
				return <DeckList decks={decks.slice(0, 10)} pageSize={5}/>;
			}
	}
}
