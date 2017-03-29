import * as React from "react";
import CardList from "./CardList";
import {GameReplay, GlobalGamePlayer} from "../interfaces";
import HearthstoneJSON from "hearthstonejson";
import UserData from "../UserData";

interface PlayerInfoProps extends React.ClassAttributes<PlayerInfo> {
	build: number;
	gameId: string;
	opponentName: string;
	playerName: string;
	user: UserData;
}

interface PlayerInfoState {
	db?: Map<string, any>;
	game?: GameReplay;
	loadingDb?: boolean;
	showOpponentDeck?: boolean;
	showPlayerDeck?: boolean;
}

export default class PlayerInfo extends React.Component<PlayerInfoProps, PlayerInfoState> {

	constructor(props: PlayerInfoProps, context: any) {
		super(props, context);
		this.state = {
			db: null,
			game: null,
			loadingDb: false,
			showOpponentDeck: false,
			showPlayerDeck: false,
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
				this.setState({loadingDb: true});
				new HearthstoneJSON().getLatest().then((cards) => this.buildDb(cards));
			}
			return;
		}
		this.setState({loadingDb: true});
		new HearthstoneJSON().get(build).then((cards) => this.buildDb(cards));
	}

	private buildDb(cards: any) {
		let map = new Map<string, any>();
		cards.forEach((card) => map = map.set(card.id, card));
		this.setState({db: map, loadingDb: false});
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
		}).then(() => {
			if (!this.state.db && !this.state.loadingDb) {
				this.loadDb();
			}
		});
	}

	render(): JSX.Element {
		let opponentClass = null; ;
		let playerClass = null;
		let playerDeck = [];
		let opponentDeck = [];

		if (this.state.game) {
			playerClass = this.buildPlayerClass(this.state.game.friendly_player);
			opponentClass = this.buildPlayerClass(this.state.game.opposing_player);
			if (
				this.state.game.opposing_deck &&
				Array.isArray(this.state.game.opposing_deck.cards) &&
				this.state.game.opposing_deck.cards.length > 0
			) {
				opponentDeck.push(
					<a
						className={opponentClass.join(" ")}
						onClick={() => this.setState({showOpponentDeck: !this.state.showOpponentDeck})}
					>
						{this.state.showOpponentDeck ? "Hide" : "Show"} deck
					</a>,
				);
				if (this.state.showOpponentDeck) {
					const deckClass = this.toTitleCase(this.state.game.opposing_player.hero_class_name);
					opponentDeck.push(
						<CardList
							cardDb={this.state.db}
							cards={this.state.game.opposing_deck.cards}
							deckClass={deckClass}
							name={this.state.game.opposing_player.name + "'s " + deckClass}
							showButton={this.state.game.opposing_player.hero_id.startsWith("HERO_")}
							id={1}
							clickable={this.props.user.hasFeature("carddb")}
						/>,
					);
				}
			}
			if (
				this.state.game.friendly_deck &&
				Array.isArray(this.state.game.friendly_deck.cards) &&
				this.state.game.friendly_deck.cards.length > 0
			) {
				playerDeck.push(
					<a className={playerClass.join(" ")} onClick={() => this.setState({showPlayerDeck: !this.state.showPlayerDeck})}>
						{this.state.showPlayerDeck ? "Hide" : "Show"} deck
					</a>,
				);
				if (this.state.showPlayerDeck) {
					const deckClass = this.toTitleCase(this.state.game.friendly_player.hero_class_name);
					playerDeck.push(
						<CardList
							cardDb={this.state.db}
							cards={this.state.game.friendly_deck.cards}
							deckClass={deckClass}
							name={this.state.game.friendly_player.name + "'s " + deckClass}
							showButton={this.state.game.friendly_player.hero_id.startsWith("HERO_")}
							id={2}
							clickable={this.props.user.hasFeature("carddb")}
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

	buildPlayerClass(player: GlobalGamePlayer): string[] {
		let playerClass = ["infobox-value"];
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
}
