import * as React from "react";
import DeckTile from "./DeckTile";
import Pager from "./Pager";
import {CardObj, DeckObj} from "../interfaces";

interface DeckListState {
	page: number;
}

interface DeckListProps extends React.ClassAttributes<DeckList> {
	decks: DeckObj[];
	pageSize: number;
	hideTopPager?: boolean;
	compareWith?: CardObj[];
}

export default class DeckList extends React.Component<DeckListProps, DeckListState> {
	constructor(props: DeckListProps, state: DeckListState) {
		super(props, state);
		this.state = {
			page: 0,
		}
	}

	componentWillReceiveProps(nextProps: DeckListProps) {
		if (nextProps.decks !== this.props.decks
			|| nextProps.pageSize !== this.props.pageSize) {
			this.setState({page: 0});
		}
	}

	render(): JSX.Element {
		const pageOffset = this.state.page * this.props.pageSize;
		const nextPageOffset = pageOffset + this.props.pageSize;
		const deckCount = this.props.decks.length;

		const deckTiles = [];
		const visibleDecks = this.props.decks.slice(pageOffset, nextPageOffset)
		visibleDecks.forEach(deck => {
			deckTiles.push(
				<DeckTile
					cards={deck.cards}
					deckId={deck.deckId}
					duration={deck.duration}
					playerClass={deck.playerClass}
					numGames={deck.numGames}
					winrate={deck.winrate}
					compareWith={this.props.compareWith}
				/>
			);
		});

		let next = null;
		if (deckCount > nextPageOffset) {
			next = () => this.setState({page: this.state.page + 1});
		}

		let prev = null;
		if (this.state.page > 0) {
			prev = () => this.setState({page: this.state.page - 1});
		}

		const min = pageOffset + 1;
		const max = Math.min(pageOffset + this.props.pageSize, deckCount);
		const pager = (top) => {
			return (
				<div className="paging pull-right">
					<span className={top ? "hidden-xs" : null}>{min + "–" + max + " out of  " + deckCount}</span>
					<Pager previous={prev} next={next} />
				</div>
			);
		};
		return (
			<div className="deck-list">
				{!this.props.hideTopPager && pager(true)}
				<div className="clearfix" />
				<div className="row header-row">
					<div className="col-lg-2 col-md-2 col-sm-2 col-xs-6">
						Deck
					</div>
					<div className="col-lg-1 col-md-1 col-sm-1 col-xs-3" style={{textAlign: "center"}}>
						Winrate
					</div>
					<div className="col-lg-1 col-md-1 col-sm-1 col-xs-3" style={{textAlign: "center"}}>
						Games
					</div>
					<div className="col-lg-1 col-md-1 hidden-sm hidden-xs" style={{textAlign: "center"}}>
						Duration
					</div>
					<div className="col-lg-1 hidden-md hidden-sm hidden-xs" style={{textAlign: "center"}}>
						Cost
					</div>
					<div className="col-lg-6 col-md-7 col-sm-8 hidden-xs">
						Cards
					</div>
				</div>
				<ul>
					{deckTiles}
				</ul>
				{pager(false)}
			</div>
		);
	}
}
