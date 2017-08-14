import * as React from "react";
import CardList from "./CardList";
import {GameReplay, GlobalGamePlayer} from "../interfaces";
import CardData from "../CardData";
import {getHeroDbfId} from "../helpers";

interface PlayerInfoProps {
	build: number;
	gameId: string;
	opponentName: string;
	playerName: string;
	cardData: CardData;
}

interface PlayerInfoState {
	game?: GameReplay;
	showOpponentDeck?: boolean;
	showPlayerDeck?: boolean;
}

export default class PlayerInfo extends React.Component<PlayerInfoProps, PlayerInfoState> {

	constructor(props: PlayerInfoProps, context: any) {
		super(props, context);
		this.state = {
			game: null,
			showOpponentDeck: false,
			showPlayerDeck: false,
		};
		if (this.props.gameId) {
			this.fetch();
		}
	}

	protected fetch() {
		fetch("/api/v1/games/" + this.props.gameId + "/", {
			credentials: "include",
		}).then((response) => {
			return response.json();
		}).then((json: any) => {
			this.setState({
				game: json,
			});
		});
	}

	render(): JSX.Element {
		let opponentClass = null;
		let playerClass = null;
		const playerDeck = [];
		const opponentDeck = [];

		if (this.state.game) {
			const {friendly_deck, friendly_player, global_game, opposing_deck, opposing_player} = this.state.game;
			playerClass = this.buildPlayerClass(friendly_player);
			opponentClass = this.buildPlayerClass(opposing_player);

			if (opposing_deck && Array.isArray(opposing_deck.cards) && opposing_deck.cards.length > 0) {
				opponentDeck.push(
					<a
						className={opponentClass.join(" ")}
						onClick={() => this.setState({showOpponentDeck: !this.state.showOpponentDeck})}
					>
						{this.state.showOpponentDeck ? "Hide Deck" : "Show Deck"}
					</a>,
				);
				if (this.state.showOpponentDeck) {
					const deckClass = this.toTitleCase(opposing_player.hero_class_name);
					opponentDeck.push(
						<CardList
							cardData={this.props.cardData}
							cardList={opposing_deck.cards}
							heroes={[getHeroDbfId(this.props.cardData, opposing_player)]}
							deckClass={deckClass}
							format={global_game.format}
							name={this.pluralize(opposing_player.name) + " " + deckClass}
							showButton={this.showCopyButton(opposing_player)}
							id={1}
						/>,
					);
				}
			}
			if (friendly_deck && Array.isArray(friendly_deck.cards) && friendly_deck.cards.length > 0) {
				playerDeck.push(
					<a className={playerClass.join(" ")} onClick={() => this.setState({showPlayerDeck: !this.state.showPlayerDeck})}>
						{this.state.showPlayerDeck ? "Hide Deck" : "Show Deck"}
					</a>,
				);
				if (this.state.showPlayerDeck) {
					const deckClass = this.toTitleCase(friendly_player.hero_class_name);
					playerDeck.push(
						<CardList
							cardData={this.props.cardData}
							cardList={friendly_deck.cards}
							heroes={[getHeroDbfId(this.props.cardData, friendly_player)]}
							format={global_game.format}
							deckClass={deckClass}
							name={this.pluralize(friendly_player.name) + " " + deckClass}
							showButton={this.showCopyButton(friendly_player)}
							id={2}
						/>,
					);
				}
			}
		}
		else {
			playerClass = opponentClass = this.buildPlayerClass(null);
		}

		return (
			<ul id="infobox-players">
				<li>
					{this.props.opponentName}
					{opponentDeck}
				</li>
				<li>
					{this.props.playerName}
					{playerDeck}
				</li>
			</ul>
		);
	}

	showCopyButton(player: GlobalGamePlayer): boolean {
		const playerHero = this.props.cardData.fromCardId(player.hero_id);
		return playerHero.type === "HERO" && playerHero.collectible;
	}

	buildPlayerClass(player: GlobalGamePlayer): string[] {
		const playerClass = ["infobox-value"];
		if (!player) {
			return playerClass;
		}
		if (player.is_ai) {
			playerClass.push("player-ai");
		}
		if (player.is_first) {
			playerClass.push("first-player");
		}
		return playerClass;
	}

	toTitleCase(str: string) {
		return str.substr(0, 1).toUpperCase() + str.substr(1, str.length - 1).toLowerCase();
	}

	pluralize(str: string): string {
		return str + "'" + (str.charAt(str.length - 1) !== "s" ? "s" : "");
	}
}
