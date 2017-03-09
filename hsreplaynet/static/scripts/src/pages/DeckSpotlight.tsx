import * as React from "react";
import DeckList from "../components/DeckList";
import QueryManager from "../QueryManager";
import {DeckObj, TableData, TableQueryData} from "../interfaces";
import {toQueryString} from "../QueryParser"

interface DeckSpotlightState {
	deckData?: TableData;
}

interface DeckSpotlightProps extends React.ClassAttributes<DeckSpotlight> {
	cardData: Map<string, any>;
}

export default class DeckSpotlight extends React.Component<DeckSpotlightProps, DeckSpotlightState> {
	private readonly queryManager: QueryManager = new QueryManager();

	constructor(props: DeckSpotlightProps, state: DeckSpotlightState) {
		super(props, state);
		this.state = {
			deckData: "loading",
		}
		this.fetch();
	}

	render(): JSX.Element {
		const deckData = this.state.deckData;
		let content = null;

		if (!deckData || deckData === "loading" || !this.props.cardData) {
			content = (
				<div className="content-message">
					<h2>Loading…</h2>
				</div>
			);
		}
		else if (deckData === "error") {
			content = (
				<div className="content-message">
					<h2>Can't find decks :(</h2>
					Please check back later.
				</div>
			);
		}
		else {
			const decks = this.getDecks(deckData);
			content = [
				<h3>Here's a selection of decks which have been rising in popularity over the last 48 hours.</h3>,
				<h3>Try them out to see what you think!</h3>,
				<DeckList decks={decks} pageSize={9} hideTopPager urlGameType={null}/>
			];
		}

		return (
			<div id="deck-spotlight">
				<h1>Trending Decks</h1>
				{content}
				<section id="deck-db-link">
					<h2>Can't find what you are looking for?</h2>
					<a href="/decks/" className="promo-button">Check out all the decks!</a>
				</section>
			</div>
		);
	}
	
	getDecks(deckData: TableQueryData): DeckObj[] {
		const decks: DeckObj[] = [];
		const data = deckData.series.data;
		Object.keys(data).forEach(key => {
			if (!data[key].length) {
				return;
			}
			data[key].sort((a, b) => +b["popularity_delta"] - +a["popularity_delta"]);
			const deck = data[key][0];
			const cards = JSON.parse(deck["deck_list"]);
			const deckList = cards.map(c => {return {card: this.props.cardData.get(''+c[0]), count: c[1]}});
			decks.push({
				cards: deckList,
				deckId: +deck["deck_id"],
				duration: +deck["avg_game_length_seconds"],
				numGames: +deck["total_games"],
				playerClass: key,
				winrate: +deck["win_rate"],
			});
		});
		decks.sort((a, b) => a.playerClass > b.playerClass ? 1 : -1);
		return decks;
	}

	fetch(): void {
		this.queryManager.fetch(
			"/analytics/query/trending_decks_by_popularity",
			(data) => this.setState({deckData: data})
		);
	}
}
