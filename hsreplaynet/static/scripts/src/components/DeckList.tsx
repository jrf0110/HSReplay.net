import * as React from "react";
import DeckTile from "./DeckTile";
import InfoIcon from "./InfoIcon";
import Pager from "./Pager";
import SortIndicator from "./SortIndicator";
import {SortDirection} from "./SortableTable";
import {CardObj, DeckObj, FragmentChildProps} from "../interfaces";
import {getDustCost, getManaCost} from "../helpers";

interface DeckListProps extends FragmentChildProps, React.ClassAttributes<DeckList> {
	decks: DeckObj[];
	pageSize: number;
	urlGameType: string;
	hideTopPager?: boolean;
	compareWith?: CardObj[];
	sortBy?: string;
	setSortBy?: (sortBy: string) => void;
	sortDirection?: SortDirection;
	setSortDirection?: (sortDirection: SortDirection) => void;
	page?: number;
	setPage?: (page: number) => void;
}

export default class DeckList extends React.Component<DeckListProps, void> {
	private cache: any;

	constructor(props: DeckListProps, context) {
		super(props, context);
		this.cache = {};
		this.cacheDecks(props.decks);
	}

	componentWillReceiveProps(nextProps: DeckListProps) {
		if (nextProps.decks !== this.props.decks || nextProps.pageSize !== this.props.pageSize && this.props.setPage) {
			this.props.setPage(1);
		}
		this.cacheDecks(nextProps.decks);
	}

	cacheDecks(decks: DeckObj[]) {
		for(let i in decks) {
			const deck = decks[i];
			const id = deck.deckId;
			if(typeof this.cache[id] !== "undefined") {
				continue;
			}
			this.cache[id] = {
				dust: getDustCost(deck.cards),
				mana: getManaCost(deck.cards),
			};
		}
	}

	render(): JSX.Element {
		const currentPage = typeof this.props.page !== "undefined" ? this.props.page : 1;
		const pageOffset = (currentPage - 1) * this.props.pageSize;
		const nextPageOffset = pageOffset + this.props.pageSize;
		const deckCount = this.props.decks.length;


		let cacheProp = null;
		let sortProp = this.props.sortBy;
		switch (sortProp) {
			case "winrate":
				sortProp = "winrate";
				break;
			case "popularity":
				sortProp = "numGames";
				break;
			case "duration":
				sortProp = "duration";
				break;
			case "dust":
				cacheProp = "dust";
				break;
			case "mana":
				cacheProp = "mana";
				break;
		}

		const decks = this.props.decks.slice(0);

		if(sortProp) {
			const direction = this.props.sortDirection === "ascending" ? 1 : -1;
			decks.sort((a: DeckObj, b: DeckObj) => {
				let x = +a[sortProp];
				let y = +b[sortProp];
				if (cacheProp !== null) {
					x = +this.cache[a.deckId][cacheProp];
					y = +this.cache[b.deckId][cacheProp];
				}
				if (x !== y) {
					return (x - y) * direction;
				}
				return a.deckId.localeCompare(b.deckId) * direction;
			});
		}

		const deckTiles = [];
		const visibleDecks = decks.slice(pageOffset, nextPageOffset);
		visibleDecks.forEach((deck) => {
			deckTiles.push(
				<DeckTile
					cards={deck.cards}
					deckId={deck.deckId}
					duration={deck.duration}
					playerClass={deck.playerClass}
					numGames={deck.numGames}
					winrate={deck.winrate}
					compareWith={this.props.compareWith}
					dustCost={this.cache[deck.deckId].dust}
					urlGameType={this.props.urlGameType}
				/>,
			);
		});

		let next = null;
		if (deckCount > nextPageOffset && typeof this.props.setPage === "function") {
			next = () => this.props.setPage(currentPage + 1);
		}

		let prev = null;
		if (currentPage > 1 && typeof this.props.setPage === "function") {
			prev = () => this.props.setPage(currentPage - 1);
		}

		const min = pageOffset + 1;
		const max = Math.min(pageOffset + this.props.pageSize, deckCount);
		const pager = (top) => {
			if (this.props.decks.length <= this.props.pageSize || !this.props.setPage) {
				return null;
			}
			return (
				<div className="paging pull-right">
					<span className={top ? "hidden-xs" : null}>{min + "–" + max + " out of  " + deckCount}</span>
					<Pager previous={prev} next={next} />
				</div>
			);
		};

		const isSortable = typeof this.props.setSortBy === "function" && typeof this.props.setSortDirection === "function";
		const sortIndicator = (name: string): JSX.Element => {
			if (!isSortable) {
				return null;
			}
			return <SortIndicator
				direction={name === this.props.sortBy ? this.props.sortDirection : null}
			/>;
		};

		const headerSortable = isSortable ? "header-sortable " : "";
		const onClick = (name: string) => {
			if (this.props.sortBy === name) {
				this.props.setSortDirection(this.props.sortDirection === "ascending" ? "descending" : "ascending");
			}
			else {
				this.props.setSortDirection("descending");
				this.props.setSortBy(name);
			}
		};

		return (
			<div className="deck-list">
				{!this.props.hideTopPager && pager(true)}
				<div className="clearfix" />
				<div className="row header-row">
					<div className={headerSortable + "col-lg-2 col-md-2 col-sm-2 col-xs-6"} onClick={() => onClick("dust")}>
						Deck / Cost
						{sortIndicator("dust")}
						<InfoIcon header="Crafting Cost" content="Total amount of dust required to craft the deck."/>
					</div>
					<div className={headerSortable + "header-center col-lg-1 col-md-1 col-sm-1 col-xs-3"} onClick={() => onClick("winrate")}>
						Winrate
						{sortIndicator("winrate")}
						<InfoIcon header="Winrate" content="Percentage of games won by the deck." />
					</div>
					<div className={headerSortable + "header-center col-lg-1 col-md-1 col-sm-1 col-xs-3"} onClick={() => onClick("popularity")}>
						Games
						{sortIndicator("popularity")}
						<InfoIcon header="Games Played" content="Number of recorded games where the deck is played." />
					</div>
					<div className={headerSortable + "header-center col-lg-1 col-md-1 hidden-sm hidden-xs"} onClick={() => onClick("duration")}>
						Duration
						{sortIndicator("duration")}
						<InfoIcon header="Game Duration" content="How long a game takes on average when the deck is played." />
					</div>
					<div className={headerSortable + "header-center col-lg-1 hidden-md hidden-sm hidden-xs"} onClick={() => onClick("mana")}>
						Mana
						{sortIndicator("mana")}
						<InfoIcon header="Mana Curve" content="Distribution of card costs for the deck." />
					</div>
					<div className="col-lg-6 col-md-7 col-sm-8 hidden-xs">
						{this.props.compareWith ? "Changes" : "Cards"}
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
