import * as React from "react";
import DeckList from "./DeckList"
import {Deck, GameReplay, GlobalGamePlayer} from "../interfaces"
import HearthstoneJSON from "hearthstonejson";

interface PlayerInfoProps extends React.ClassAttributes<PlayerInfo> {
	gameId: string;
	playerName: string;
	opponentName: string;
	build: number;
}

interface PlayerInfoState {
	showOpponentDeck?: boolean;
	showPlayerDeck?: boolean;
	db?: Map<string, any>;
	loadingDb?: boolean;
	game?: GameReplay;
}

export default class PlayerInfo extends React.Component<PlayerInfoProps, PlayerInfoState> {

	constructor(props: PlayerInfoProps, context: any) {
		super(props, context);
		this.state = {
			showPlayerDeck: false,
			showOpponentDeck: false,
			loadingDb: false,
			db: null,
			game: null
		};
		if (this.props.build) {
			this.loadDb();
		}
		if (this.props.gameId) {
			this.fetch();
		}
	}

	protected loadDb() {
		if (this.state.loadingDb) {
			return;
		}
		let build = this.props.build || this.state.game && this.state.game.global_game.build;
		if (!build) {
			if (this.state.game) {
				this.setState({loadingDb: true})
				new HearthstoneJSON().getLatest((cards) => this.buildDb(cards));
			}
			return;
		}
		this.setState({loadingDb: true})
		new HearthstoneJSON().get(build, (cards) => this.buildDb(cards));
	}

	private buildDb(cards: any) {
		let map = new Map<string, any>();
		cards.forEach(card => map = map.set(card.id, card));
		this.setState({db: map, loadingDb: false});
	}

	protected fetch() {
		fetch("/api/v1/games/" + this.props.gameId + "/", {
			credentials: "include",
		}).then((response) => {
			return response.json();
		}).then((json: any) => {
			this.setState({
				game: json
			});
		}).then(() => {
			if (!this.state.db && !this.state.loadingDb) {
				this.loadDb();
			}
		});
	}

	render(): JSX.Element {
		let playerCards = null;
		let opponentCards = null;
		let opponentClass = null;;
		let playerClass = null;
		let playerDeck = [];
		let opponentDeck = [];

		if (this.state.game) {
			playerCards = this.groupCardsById(this.state.game.friendly_deck);
			playerClass = this.buildPlayerClass(this.state.game.friendly_player);
			opponentCards = this.groupCardsById(this.state.game.opposing_deck);
			opponentClass = this.buildPlayerClass(this.state.game.opposing_player)
			if (opponentCards.size) {
				opponentDeck.push(
					<a className={opponentClass.join(" ")} onClick={() => this.setState({showOpponentDeck: !this.state.showOpponentDeck})}>
						{this.state.showOpponentDeck ? "Hide" : "Show"} deck
					</a>
				);
				if(this.state.showOpponentDeck) {
					opponentDeck.push(<DeckList cardDb={this.state.db} cards={opponentCards}/>);
				}
			}
			if (playerCards.size) {
				playerDeck.push(
					<a className={playerClass.join(" ")} onClick={() => this.setState({showPlayerDeck: !this.state.showPlayerDeck})}>
						{this.state.showPlayerDeck ? "Hide" : "Show"} deck
					</a>
				);
				if(this.state.showPlayerDeck) {
					playerDeck.push(<DeckList cardDb={this.state.db} cards={playerCards}/>);
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

	groupCardsById(deck: Deck): Map<string, number> {
		let map = new Map<string, number>();
		if (deck && deck.cards){
			deck.cards.forEach(c => map = map.set(c, (map.get(c) || 0) + 1));
		}
		return map;
	}

	buildPlayerClass(player: GlobalGamePlayer): string[] {
		let playerClass = ["infobox-value"];
		if (!player) {
			return playerClass;
		}
		if (player.is_ai) {
			playerClass.push("player-ai")
		}
		if (player.is_first) {
			playerClass.push("first-player")
		}
		return playerClass;
	}

}
