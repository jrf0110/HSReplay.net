import * as React from "react";
import CardTile from "./CardTile";

interface CardSearchState {
	selectedCards?: any[];
	cardSearchText?: string;
	cardSearchHasFocus?: boolean;
	cardSearchCount?: number;
}

interface CardSearchProps extends React.ClassAttributes<CardSearch> {
	availableCards: any[]
	onCardsChanged: (cards: any[]) => void;
}

export default class CardSearch extends React.Component<CardSearchProps, CardSearchState> {
	readonly defaultCardCount = 10;

	constructor(props: CardSearchProps, state: CardSearchState) {
		super(props, state);
		this.state = {
			selectedCards: [],
			cardSearchText: "",
			cardSearchHasFocus: false,
			cardSearchCount: this.defaultCardCount,
		}
	}

	render(): JSX.Element {
		const searchLostFocus = () => {
			this.setState({cardSearchHasFocus: false});
		}
		
		const cards = [];
		const matches = this.props.availableCards.filter(card => !this.state.cardSearchText || card.name.toLowerCase().indexOf(this.state.cardSearchText.toLowerCase()) !== -1);
		matches.slice(0, this.state.cardSearchCount).forEach(card => {
			const addCard = () => {
				const newState = {cardSearchText: "", cardSearchCount: this.defaultCardCount};
				if (this.state.selectedCards.indexOf(card) === -1) {
					const newSelectedCards = this.state.selectedCards.concat([card]);
					newSelectedCards.sort((a, b) => a["name"] > b["name"] ? 1 : -1);
					newSelectedCards.sort((a, b) => a["cost"] > b["cost"] ? 1 : -1);
					newState["selectedCards"] = newSelectedCards;
					this.props.onCardsChanged(newSelectedCards);
				}
				this.setState(newState);
			};
			cards.push(
				<li key={card.id}>
					<a href="#" onMouseDown={addCard}>
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
		if (this.state.cardSearchHasFocus && cards.length) {
			cardSearchResults = (
				<div className="card-search-results" onScroll={onSearchScroll}>
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
				/>
				{cardSearchResults}
				<ul>
					{this.getSelectedCards()}
				</ul>
			</div>
		);
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
