import * as React from "react";
import CardTile from "./CardTile";

interface CardSearchState {
	selectedCards?: any[];
	cardSearchText?: string;
	cardSearchHasFocus?: boolean;
	cardSearchCount?: number;
	selectedIndex?: number;
	selectedCard?: any;
}

interface CardSearchProps extends React.ClassAttributes<CardSearch> {
	availableCards: any[]
	onCardsChanged: (cards: any[]) => void;
}

export default class CardSearch extends React.Component<CardSearchProps, CardSearchState> {
	readonly defaultCardCount = 10;
	private search: HTMLDivElement;

	constructor(props: CardSearchProps, state: CardSearchState) {
		super(props, state);
		this.state = {
			selectedCards: [],
			cardSearchText: "",
			cardSearchHasFocus: false,
			cardSearchCount: this.defaultCardCount,
			selectedIndex: 0,
			selectedCard: null,
		}
	}

	render(): JSX.Element {
		const searchLostFocus = () => {
			this.setState({cardSearchHasFocus: false});
		}
		const availableCards = this.props.availableCards || [];
		
		const cards = [];
		const matches = availableCards.filter(card => !this.state.cardSearchText || card.name.toLowerCase().indexOf(this.state.cardSearchText.toLowerCase()) !== -1);
		matches.slice(0, this.state.cardSearchCount).forEach((card, index) => {
			const selected = this.state.selectedIndex === index;
			if (selected) {
				this.state.selectedCard = card;
			}
			cards.push(
				<li key={card.id} onMouseEnter={() => this.setState({selectedIndex: index, selectedCard: card})}>
					<a className={selected ? "selected" : undefined} href="#" onMouseDown={() => this.addCard(card)}>
						<CardTile card={card} count={1} height={34} rarityColored />
					</a>
				</li>
			);
		});

		if (this.state.cardSearchText && !matches.length) {
			cards.push(
				<li>
					<div className="search-message">No cards found</div>
				</li>
			);
		}

		const onSearchScroll = (event: React.UIEvent) => {
			if (event.target["scrollTop"] + 200 >= event.target["scrollHeight"]) {
				if (matches.length > this.state.cardSearchCount) {
					this.setState({cardSearchCount: this.state.cardSearchCount + this.defaultCardCount});
				}
			}
		}

		let cardSearchResults = null;
		if (this.state.cardSearchHasFocus && cards.length && this.state.cardSearchText.length) {
			cardSearchResults = (
				<div className="card-search-results" onScroll={onSearchScroll} ref={(search) => this.search = search}>
					<ul>
						{cards}
					</ul>
				</div>
			);
		}

		return (
			<div className="card-search">
				<input 
					className="form-control"
					type="search"
					placeholder="Search..."
					onFocus={() => this.setState({cardSearchHasFocus: true})}
					onBlur={() => this.setState({cardSearchHasFocus: false})}
					value={this.state.cardSearchText}
					onChange={(e) => this.setState({cardSearchText: e.target["value"]})}
					onKeyDown={(e) => this.onKeyDown(e, cards.length)}
				/>
				{cardSearchResults}
				<ul>
					{this.getSelectedCards()}
				</ul>
			</div>
		);
	}

	addCard(card: any): void {
		const newState = {cardSearchText: "", cardSearchCount: this.defaultCardCount, selectedIndex: 0, selectedcard: null};
		if (this.state.selectedCards.indexOf(card) === -1) {
			const newSelectedCards = this.state.selectedCards.concat([card]);
			newSelectedCards.sort((a, b) => a["name"] > b["name"] ? 1 : -1);
			newSelectedCards.sort((a, b) => a["cost"] > b["cost"] ? 1 : -1);
			newState["selectedCards"] = newSelectedCards;
			this.props.onCardsChanged(newSelectedCards);
		}
		this.setState(newState);
	};

	onKeyDown(event: React.KeyboardEvent, numCards: number): void {
		switch(event.key) {
			case "ArrowDown":
				this.setState({selectedIndex: Math.min(numCards - 1, this.state.selectedIndex + 1)});
				if(this.search["scrollTop"] === 0) {
					this.search["scrollTop"] += 5;
				}
				this.search["scrollTop"] += 35;
				break;
			case "ArrowUp":
				this.setState({selectedIndex: Math.max(0, this.state.selectedIndex - 1)});
				this.search["scrollTop"] -= 35;
				break;
			case "Enter":
				this.addCard(this.state.selectedCard);
				break;
		}
	}

	getSelectedCards(): JSX.Element[] {
		const selectedCards = [];
		this.state.selectedCards.forEach(card => {
			const removeCard = () => {
				const newSelectedCards = this.state.selectedCards.filter(x => x !== card);
				this.props.onCardsChanged(newSelectedCards)
				this.setState({selectedCards: newSelectedCards});
			};
			selectedCards.push(
				<li>
					<a href="#" onClick={removeCard}>
						<div className="glyphicon glyphicon-remove" />
						<CardTile card={card} count={1} height={34} rarityColored />
					</a>
				</li>
			);
		});
		return selectedCards;
	}
}
