import * as React from "react";
import CardData from "../CardData";
import DataInjector from "../components/DataInjector";
import TableLoading from "../components/loading/TableLoading";
import TrendingDecksList from "../components/trending/TrendingDecksList";
import DataManager from "../DataManager";
import HideLoading from "../components/loading/HideLoading";
import DataText from "../components/DataText";
import { getAge } from "../PrettyTime";
import Tooltip from "../components/Tooltip";

interface DeckSpotlightProps {
	cardData: CardData;
}

export default class DeckSpotlight extends React.Component<DeckSpotlightProps, void> {
	private readonly dataManager: DataManager = new DataManager();

	render(): JSX.Element {
		return (
			<div id="deck-spotlight">
				<span className="pull-right">
					Last updated
					<Tooltip
						header="Automatic updates"
						content="This page is periodically updated as new data becomes available."
					>
						<DataInjector
							dataManager={this.dataManager}
							query={{url: "trending_decks_by_popularity", params: {}}}
							modify={(data) => data && data.as_of ? getAge(new Date(data.as_of)) : null}
						>
							<HideLoading><DataText /></HideLoading>
						</DataInjector>
					</Tooltip>
				</span>
				<h1>Trending Decks</h1>
				<h3>Here's a selection of decks which have been rising in popularity over the last 48 hours.</h3>
				<DataInjector dataManager={this.dataManager} query={{url: "trending_decks_by_popularity", params: {}}}>
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
