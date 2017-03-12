import * as React from "react";
import CardData from "../CardData";
import DataInjector from "../components/DataInjector";
import TableLoading from "../components/loading/TableLoading";
import TrendingDecksList from "../components/trending/TrendingDecksList";
import DataManager from "../DataManager";

interface DeckSpotlightProps extends React.ClassAttributes<DeckSpotlight> {
	cardData: CardData;
}

export default class DeckSpotlight extends React.Component<DeckSpotlightProps, void> {
	private readonly dataManager: DataManager = new DataManager();

	render(): JSX.Element {
		return (
			<div id="deck-spotlight">
				<h1>Trending Decks</h1>
				<h3>Here's a selection of decks which have been rising in popularity over the last 48 hours.</h3>
				<h3>Try them out to see what you think!</h3>
				<DataInjector dataManager={this.dataManager} url="trending_decks_by_popularity">
					<TableLoading cardData={this.props.cardData}>
						<TrendingDecksList />
					</TableLoading>
				</DataInjector>
				<section id="deck-db-link">
					<h2>Can't find what you are looking for?</h2>
					<a href="/decks/" className="promo-button">Check out all the decks!</a>
				</section>
			</div>
		);
	}
}
