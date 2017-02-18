import * as React from "react";
import CardIcon from "./CardIcon";
import CardSearch from "./CardSearch";
import ClassFilter from "./ClassFilter";
import ClassIcon from "./ClassIcon";
import ManaCurve from "./ManaCurve";
import Pager from "./Pager";
import QueryManager from "../QueryManager";
import {ChartSeries, TableData} from "../interfaces";
import {toTitleCase, toPrettyNumber} from "../helpers";

type DeckType = "aggro" | "midrange" | "control";
type GameMode = "RANKED_STANDARD" | "RANKED_WILD" | "TAVERNBRAWL";
type SortProp = "win_rate" | "total_games";

interface DeckDiscoverState {
	cardSearchExcludeKey?: number;
	cardSearchIncludeKey?: number;
	cards?: any[];
	classFilterKey?: string;
	deckData?: Map<string, TableData>;
	deckType?: DeckType;
	excludedCards?: any[];
	gameMode?: GameMode;
	includedCards?: any[];
	page?: number;
	selectedClasses?: Map<string, boolean>;
	showFilters?: boolean;
	sortProp?: SortProp;
}

interface DeckDiscoverProps extends React.ClassAttributes<DeckDiscover> {
	cardData: Map<string, any>;
}

export default class DeckDiscover extends React.Component<DeckDiscoverProps, DeckDiscoverState> {
	private readonly queryManager: QueryManager = new QueryManager();
	private readonly pageSize = 12;

	constructor(props: DeckDiscoverProps, state: DeckDiscoverState) {
		super(props, state);
		this.state = {
			cardSearchExcludeKey: 0,
			cardSearchIncludeKey: 0,
			cards: null,
			classFilterKey: "ALL",
			deckData: new Map<string, TableData>(),
			deckType: null,
			excludedCards: [],
			includedCards: [],
			gameMode: "RANKED_STANDARD",
			page: 0,
			selectedClasses: null,
			showFilters: false,
			sortProp: "win_rate",
		}

		this.fetch();
	}
	
	render(): JSX.Element {
		const selectedClass = this.getSelectedClass();
		const pageOffset = this.state.page * this.pageSize;
		const decks = [];
		const deckData = this.state.deckData.get(this.state.gameMode);
		if (!deckData) {
			this.fetch();
		}
		let deckCount = 0;
		if (this.props.cardData) {
			if (!this.state.cards) {
				const cards = [];
				this.props.cardData.forEach((card, id) => {
					if (card.name && card.collectible && ["MINION", "SPELL", "WEAPON"].indexOf(card.type) !== -1) {
						cards.push(card);
					}
				});
				cards.sort((a, b) => a["name"] > b["name"] ? 1 : -1);
				cards.sort((a, b) => a["cost"] > b["cost"] ? 1 : -1);
				this.state.cards = cards;
			}

			if (deckData && deckData !== "loading" && deckData !== "error") {
				const deckElements = [];
				const data = deckData.series.data;
				Object.keys(data).forEach(key => {
					if (selectedClass === "ALL" || selectedClass === key) {
						data[key].forEach(deck => {
							const cards = JSON.parse(deck["deck_list"]);
							const cardData = cards.map(c => {return {card: this.props.cardData.get(''+c[0]), count: c[1]}});
							if (!this.state.includedCards.length || this.state.includedCards.every(card => cardData.some(cardObj => cardObj.card.id === card.id))) {
								if (!this.state.excludedCards.length || !this.state.excludedCards.some(card => cardData.some(cardObj => cardObj.card.id === card.id))) {
									const costSum = cardData.reduce((a, b) => a + b.card.cost * b.count, 0);
									if (!this.state.deckType || this.state.deckType === "aggro" && costSum < 80
										|| this.state.deckType === "midrange" && costSum >= 80 && costSum < 100
										|| this.state.deckType === "control" && costSum >= 100) {
											deck["cards"] = cardData;
											deck["player_class"] = key;
											deckElements.push(deck);
										}
								}
							}
						});
					}
				});
				deckElements.sort((a, b) => b[this.state.sortProp] - a[this.state.sortProp]);
				deckElements.slice(pageOffset, pageOffset + this.pageSize).forEach(deck => decks.push(this.buildDeckTile(deck)));
				deckCount = deckElements.length;
			}
		}

		let next = null;
		if (deckCount > (this.state.page + 1) * this.pageSize) {
			next = () => this.setState({page: this.state.page + 1});
		}

		let prev = null;
		if (this.state.page > 0) {
			prev = () => this.setState({page: this.state.page - 1});
		}
		
		let content = null;
		if (!deckData || deckData === "loading" || !this.props.cardData) {
			content = (
				<div className="content-message">
					<h2>Loading...</h2>
				</div>
			);
		}
		else if (deckData === "error") {
			content = (
				<div className="content-message">
					<h2>Something went wrong :(</h2>
					Please try again later.
				</div>
			);
		}
		else if(deckCount === 0) {
			content = (
				<div className="content-message">
					<h2>No decks found</h2>
					<a href="#" onClick={() => this.resetFilters()}>Reset filters</a>
				</div>
			);
		}
		else {
			const min = pageOffset + 1;
			const max = Math.min(pageOffset + this.pageSize, deckCount);
			content = [
				<div className="paging pull-right">
					<span>{min + " - " + max + " out of  " + deckCount}</span>
					<Pager previous={prev} next={next} />
				</div>,
				<div className="clearfix" />,
				<div className="row header-row">
					<div className="col-lg-2 col-md-2">
						Deck
					</div>
					<div className="col-lg-1 col-md-1">
						Winrate
					</div>
					<div className="col-lg-1 col-md-1">
						Mana
					</div>
					<div className="col-lg-8 col-md-8">
						Cards
					</div>
				</div>,
				<ul>
					{decks}
				</ul>,
				<div className="paging pull-right">
					<span>{min + " - " + max + " out of  " + deckCount}</span>
					<Pager previous={prev} next={next} />
				</div>
			];
		}

		const filterClassNames = ["filter-wrapper"];
		const contentClassNames = ["deck-list-wrapper"]
		if (!this.state.showFilters) {
			filterClassNames.push("hidden-xs");
		}
		else {
			contentClassNames.push("hidden-xs");
		}

		let resetButton = null;
		if (this.state.deckType || this.state.excludedCards.length || this.state.includedCards.length || selectedClass && selectedClass !== "ALL") {
			resetButton = <a href="#" onClick={() => this.resetFilters()}>Reset all filters</a>
		}

		let resetInclude = null;
		if (this.state.includedCards.length) {
			const onClick = () => {
				this.setState({includedCards: [], cardSearchIncludeKey: this.state.cardSearchIncludeKey + 1});
			}
			resetInclude = (
				<a href="#" onClick={onClick} style={{float: "right"}}>clear</a>
			);
		}
		
		let resetExclude = null;
		if (this.state.excludedCards.length) {
			const onClick = () => {
				this.setState({excludedCards: [], cardSearchExcludeKey: this.state.cardSearchExcludeKey + 1});
			}
			resetExclude = (
				<a href="#" onClick={onClick} style={{float: "right"}}>clear</a>
			);
		}

		return (
			<div className="deck-discover">
				<div className={filterClassNames.join(" ")}>
					<span className="visible-xs">
						<button
							className="btn btn-primary"
							type="button"
							onClick={() => this.setState({showFilters: false})}
						>
							Back
						</button>
					</span>
					<div className="filters">
						<div className="pull-right">
							{resetButton}
						</div>
						<h4>Class</h4>
						<ClassFilter 
							hideAll
							key={this.state.classFilterKey}
							multiSelect={false}
							filters="All"
							minimal
							selectionChanged={(selected) => this.setState({selectedClasses: selected, page: 0})}
						/>
						<h4>Deck type</h4>
						<ul>
							{this.buildDeckTypeFilter("aggro")}
							{this.buildDeckTypeFilter("midrange")}
							{this.buildDeckTypeFilter("control")}
						</ul>
						<h4>Mode</h4>
						<ul>
							{this.buildModeFilter("RANKED_STANDARD")}
							{this.buildModeFilter("RANKED_WILD")}
							{this.buildModeFilter("TAVERNBRAWL")}
						</ul>
						{resetInclude}
						<h4>Include cards</h4>
						<CardSearch
							key={"cardinclude" + this.state.cardSearchIncludeKey}
							availableCards={this.state.cards}
							onCardsChanged={(cards) => this.setState({includedCards: cards, page: 0})}
						/>
						{resetExclude}
						<h4>Exclude cards</h4>
						<CardSearch
							key={"cardexclude" + this.state.cardSearchExcludeKey}
							availableCards={this.state.cards}
							onCardsChanged={(cards) => this.setState({excludedCards: cards, page: 0})}
						/>
						<h4>Sort by</h4>
						<ul>
							{this.buildSortFilter("win_rate")}
							{this.buildSortFilter("total_games")}
						</ul>
					</div>
				</div>
				<div className={contentClassNames.join(" ")}>
					{content}
				</div>
			</div>
		);
	}

	buildSortFilter(sortProp: SortProp): JSX.Element {
		const selected = this.state.sortProp === sortProp;
		const onClick = () => {
			if (!selected) {
				this.setState({sortProp: sortProp});
			}
		}
		return (
			<li onClick={onClick} className={selected ? "selected no-deselect" : null}>
				{sortProp === "win_rate" ? "Winrate" : "Popularity"}
			</li>
		);
	}

	buildDeckTypeFilter(deckType: DeckType): JSX.Element {
		const selected = this.state.deckType === deckType;
		const onClick = () => {
			this.setState({deckType: selected ? null : deckType});
		}
		return (
			<li onClick={onClick} className={selected ? "selected" : null}>
				{toTitleCase(deckType)}
			</li>
		);
	}

	buildModeFilter(gameMode: GameMode): JSX.Element {
		const selected = this.state.gameMode === gameMode;
		const onClick = () => {
			if (!selected) {
				this.setState({gameMode: gameMode});
			}
		}
		const modeStr = () => {
			switch(gameMode) {
				case "RANKED_STANDARD": return "Standard";
				case "RANKED_WILD": return "Wild";
				case "TAVERNBRAWL": return "Brawl";
			}
		}
		return (
			<li onClick={onClick} className={selected ? "selected no-deselect" : null}>
				{modeStr()}
			</li>
		);
	}

	getSelectedClass(): string {
		if (!this.state.selectedClasses) {
			return undefined;
		}
		let selectedClass = "ALL";
		this.state.selectedClasses.forEach((value, key) => {
			if(value) {
				selectedClass = key;
			}
		});
		return selectedClass;
	}

	buildDeckTile(deck: any): JSX.Element {
		const heroes = ["WARRIOR", "SHAMAN", "ROGUE", "PALADIN", "HUNTER", "DRUID", "WARLOCK", "MAGE", "PRIEST"];
		const cardIds = [];
		const cards = [];
		let dustCost = 0;
		let margin = 5;
		if (this.props.cardData) {
			deck.cards.sort((a, b) => {
				if (a.card.cost > b.card.cost) { return 1; }
				if (a.card.cost < b.card.cost) { return -1; }
				if (a.card.name > b.card.name) { return 1; }
				if (a.card.name < b.card.name) { return -1; }
				return 0;
			});
			deck.cards.forEach(obj => {
				const card = obj.card;
				dustCost += this.getCost(card.rarity) * obj.count;
				cardIds.push(card.dbfId);
				if (obj.count > 1) {
					cardIds.push(card.dbfId);
				}
				if (deck.cards.length > 21) {
					margin = 18;
				}
				cards.push(
					<li style={{marginLeft: -margin}}>
						<CardIcon cardId={card.id} mark={card.rarity === "LEGENDARY" ? "★" : obj.count > 1 && "x" + obj.count} markStyle={{color: "#f4d442", top: 0, right: 0, fontSize: "1em"}}/>
					</li>
				)
			});
		}

		let heroId = ''+(heroes.indexOf(deck.player_class) + 1);
		if(["WARRIOR", "SHAMAN", "PALADIN", "HUNTER", "MAGE", "PRIEST"].indexOf(deck.player_class) !== -1) {
			heroId += "a";
		}
		
		return (
			<li style={{backgroundImage: "url(http://art.hearthstonejson.com/v1/256x/HERO_0" + heroId + ".jpg"}}>
				<a href={"/cards/decks/" + deck.deck_id}>
					<div>
						<div className="col-lg-2 col-md-2">
							<span className="deck-name" style={{backgroundImage: "url(/static/images/64x/class-icons/" + deck.player_class.toLowerCase() + ".png"}}>{toTitleCase(deck.player_class)}</span>
							<span className="dust-cost" style={{backgroundImage: "url(/static/images/dust.png"}}>{dustCost}</span>
						</div>
						<div className="col-lg-1 col-md-1">
							<span className="win-rate">{deck.win_rate}%</span>
							<span className="game-count">{toPrettyNumber(deck.total_games)} games</span>
						</div>
						<div className="col-lg-1 col-md-1">
							<ManaCurve cardIds={cardIds} cardData={this.props.cardData} />
						</div>
						<div className="col-lg-8 col-md-8">
							<ul className="card-list" style={{paddingLeft: margin}}>
								{cards}
							</ul>
						</div>
					</div>
				</a>
			</li>
		);
	}

	getCost(rarity: string) {
		//TODO take adventures etc into account
		switch(rarity) {
			case "COMMON": return 40;
			case "RARE": return 100;
			case "EPIC": return 400;
			case "LEGENDARY": return 1600;
		}
		return 0;
	}

	resetFilters() {
		this.setState({
			cardSearchExcludeKey: this.state.cardSearchExcludeKey + 1,
			cardSearchIncludeKey: this.state.cardSearchIncludeKey + 1,
			classFilterKey: this.state.classFilterKey + 1,
			deckType: null,
			excludedCards: [],
			includedCards: [],
			page: 0,
			selectedClasses: null
		});
	}

	fetch() {
		this.queryManager.fetch(
			"/analytics/query/list_decks_by_win_rate?TimeRange=LAST_14_DAYS&RankRange=ALL&GameType=" + this.state.gameMode,
			(data) => this.setState({deckData: this.state.deckData.set(this.state.gameMode, data)})
		);
	}

}
