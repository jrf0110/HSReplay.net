import * as React from "react";
import CardTile from "./CardTile";
import {cleanText, slangToCardId, sortCards} from "../helpers";

export const enum Limit {
	SINGLE,
	NORMAL,
	UNLIMITED,
}

interface CardSearchState {
	cardSearchText?: string;
	cardSearchHasFocus?: boolean;
	cardSearchCount?: number;
	selectedIndex?: number;
}

interface CardSearchProps {
	availableCards: any[];
	id: string;
	onCardsChanged: (cards: any[]) => void;
	selectedCards: any[];
	label?: string;
	cardLimit?: Limit;
	onPaste?: (e: any) => any;
}

export default class CardSearch extends React.Component<CardSearchProps, CardSearchState> {
	readonly defaultCardCount = 10;
	private search: HTMLDivElement;
	private input: HTMLInputElement;
	private cardlist: HTMLUListElement;

	constructor(props: CardSearchProps, state: CardSearchState) {
		super(props, state);
		this.state = {
			cardSearchCount: this.defaultCardCount,
			cardSearchHasFocus: false,
			cardSearchText: "",
			selectedIndex: 0,
		};
	}

	render(): JSX.Element {
		const cards = [];
		const matches = this.getFilteredCards(this.state.cardSearchText);
		matches.slice(0, this.state.cardSearchCount).forEach((card, index) => {
			const selected = this.state.selectedIndex === index;
			cards.push(
				<li
					className={selected ? "selected" : undefined}
					key={card.id}
					onMouseDown={(event) => {
						if (event.button !== 0) {
							event.preventDefault();
							return;
						}
						this.addCard(card);
					}}
					onMouseEnter={() => this.setState({selectedIndex: index})}
				>
					<CardTile card={card} count={1} height={34} noLink/>
				</li>,
			);
		});

		if (this.state.cardSearchText && !matches.length) {
			cards.push(
				<li>
					<div className="search-message">No cards found</div>
				</li>,
			);
		}

		const onSearchScroll = (event: React.UIEvent<HTMLDivElement>) => {
			if (event.target["scrollTop"] + 200 >= event.target["scrollHeight"]) {
				if (matches.length > this.state.cardSearchCount) {
					this.setState({cardSearchCount: this.state.cardSearchCount + this.defaultCardCount});
				}
			}
		};

		let cardSearchResults = null;
		if (this.state.cardSearchHasFocus && cards.length && this.state.cardSearchText.length) {
			cardSearchResults = (
				<div className="card-search-results" onScroll={onSearchScroll} ref={(search) => this.search = search}>
					<ul ref={(ref) => this.cardlist = ref}>
						{cards}
					</ul>
				</div>
			);
		}

		let clear = null;
		if (this.state.cardSearchText) {
			clear = (
				<span
					className="glyphicon glyphicon-remove form-control-feedback"
					onClick={() => this.setState({cardSearchText: ""})}
				/>
			);
		}

		return (
			<div className="card-search search-wrapper">
				<div className="form-group has-feedback">
					<input
						id={this.props.id}
						aria-labelledby={this.props.label}
						ref={(input) => this.input = input}
						className="form-control"
						type="search"
						placeholder={this.props.onPaste ? "Search for cards or paste deck…" : "Search for cards…"}
						onFocus={() => this.setState({cardSearchHasFocus: true})}
						onBlur={() => this.setState({cardSearchHasFocus: false})}
						value={this.state.cardSearchText}
						onChange={(e) => this.setState({
							selectedIndex: 0,
							cardSearchText: e.target["value"],
						})}
						onKeyDown={(e) => this.onKeyDown(e, cards.length)}
						aria-autocomplete="list"
						onPaste={this.props.onPaste}
					/>
					{clear}
				</div>
				{cardSearchResults}
				<ul>
					{this.getSelectedCards()}
				</ul>
			</div>
		);
	}

	componentDidUpdate(prevProps: CardSearchProps, prevState: CardSearchState) {
		if(prevState.cardSearchText !== this.state.cardSearchText) {
			if (this.search) {
				this.search["scrollTop"] = 0;
			}
		}
	}

	addCard(card: any): void {
		const selected = this.props.selectedCards || [];
		if (selected.indexOf(card) === -1) {
			const newSelectedCards = selected.concat([card]);
			newSelectedCards.sort(sortCards);
			this.props.onCardsChanged(newSelectedCards);
		}
		this.setState({cardSearchText: "", cardSearchCount: this.defaultCardCount, selectedIndex: 0});
	};

	onKeyDown(event: React.KeyboardEvent<HTMLInputElement>, numCards: number): void {
		let height = 35;
		if (this.cardlist && this.cardlist.children && this.cardlist.children.length) {
			const child = this.cardlist.children[0];
			const bounds = child.getBoundingClientRect();
			height = bounds.height - 1;
		}
		let valid = true;
		switch (event.key) {
			case "ArrowDown":
				if (!this.search) {
					return;
				}
				this.setState({selectedIndex: Math.min(numCards - 1, this.state.selectedIndex + 1)});
				if (this.search["scrollTop"] === 0) {
					this.search["scrollTop"] += 5;
				}
				this.search["scrollTop"] += height;
				break;
			case "ArrowUp":
				if (!this.search) {
					return;
				}
				this.setState({selectedIndex: Math.max(0, this.state.selectedIndex - 1)});
				this.search["scrollTop"] -= height;
				break;
			case "Enter":
				const filteredCards = this.getFilteredCards(this.state.cardSearchText);
				if (!filteredCards.length) {
					return;
				}
				this.addCard(filteredCards[this.state.selectedIndex]);
				break;
			default:
				valid = false;
				break;
		}
		if (valid) {
			event.preventDefault();
		}
	}

	getFilteredCards(query: string): any[] {
		if (!this.props.availableCards) {
			return [];
		}
		const cleanQuery = cleanText(query);
		if (!cleanQuery) {
			return [];
		}
		const resultSet = [];
		let availableCards = this.props.availableCards;
		const slang = slangToCardId(cleanQuery);
		if (slang !== null) {
			availableCards = availableCards.filter((card) => {
				if (card.id === slang) {
					resultSet.push(card);
					return false;
				}
				return true;
			});
		}
		const filtered = availableCards.filter((card) => {
			if (!this.state.cardSearchText) {
				return true;
			}
			return cleanText(card.name).indexOf(cleanQuery) !== -1;
		});
		return resultSet.concat(filtered);
	}

	getSelectedCards(): JSX.Element[] {
		if (!this.props.selectedCards) {
			return null;
		}
		const cards = {};
		this.props.selectedCards.forEach((card) => {
			const key = card.id;
			if(typeof cards[key] !== "undefined") {
				cards[key].count++;
			}
			else {
				cards[key] = {
					card: card,
					count: 1,
				};
			}
		});
		return Object.keys(cards).map((key) => {
			const card = cards[key].card;
			const count = cards[key].count;
			const updateCard = (newValue: number) => {
				let updatedCount = count;
				let newSelectedCards = this.props.selectedCards.slice(0);
				while(updatedCount < newValue) {
					newSelectedCards.push(card);
					updatedCount++;
				}
				while(updatedCount > newValue) {
					let index = this.props.selectedCards.lastIndexOf(card);
					newSelectedCards.splice(index, 1);
					updatedCount--;
				}
				this.props.onCardsChanged(newSelectedCards);
			};

			const cardLimit = typeof this.props.cardLimit === "undefined" ? Limit.NORMAL : this.props.cardLimit ;
			const maxCopies = cardLimit === Limit.NORMAL ? (card.rarity === "LEGENDARY" ? 1 : 2) : 0;

			return (
				<li>
					<CardTile
						card={card}
						count={count}
						height={34}
						noLink
					/>
					<button
						onClick={() => updateCard(count - 1)}
						className="btn btn-danger"
					>
						<span
							className={"glyphicon glyphicon-minus"}
						/>
					</button>
					{cardLimit  !== Limit.SINGLE ? <button
						onClick={() => updateCard(count + 1)}
						className="btn btn-primary"
						disabled={maxCopies > 0 && count + 1 > maxCopies}
					>
						<span
							className="glyphicon glyphicon-plus"
						/>
					</button> : null}
				</li>
			);
		});
	}
}
