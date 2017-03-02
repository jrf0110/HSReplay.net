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
			content = [
				<h3>Looking for some Combo/Control?</h3>,
				this.buildDeckList(deckData, "avg_game_length_seconds", "duration"),
				<h3>Can you keep up with these winrates?</h3>,
				this.buildDeckList(deckData, "win_rate", "winrate"),
				<h3>What everyone else is playing</h3>,
				this.buildDeckList(deckData, "total_games", "numGames")
			];
		}

		return (
			<div id="deck-spotlight">
				<h1>Daily Deck Spotlight</h1>
				{content}
				<section id="deck-db-link">
					<h2>Can't find what you are looking for?</h2>
					<a href="/decks/" className="promo-button">Check out the deck database!</a>
				</section>
			</div>
		);
	}
	
	buildDeckList(deckData: TableQueryData, sortProp: string, sortProp2: string): JSX.Element {
		const decks: DeckObj[] = [];
		const data = deckData.series.data;
		Object.keys(data).forEach(key => {
			if (!data[key].length) {
				return;
			}
			data[key].sort((a, b) => +b[sortProp] - +a[sortProp]);
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

		decks.sort((a, b) => b[sortProp2] - a[sortProp2]);

		return <DeckList decks={decks.slice(0, 3)} pageSize={3} hideTopPager />;
	}

	fetch() {
		this.queryManager.fetch(
			"/analytics/query/list_decks_by_opponent_win_rate?" + toQueryString({TimeRange: "LAST_3_DAYS"}),
			(data) => this.setState({deckData: data})
		);
	}
}
