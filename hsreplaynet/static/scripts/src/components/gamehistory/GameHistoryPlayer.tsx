import React from "react";
import {CardArtProps} from "../../interfaces";


interface GameHistoryPlayerProps extends CardArtProps, React.ClassAttributes<GameHistoryPlayer> {
	name: string;
	heroId: string;
	won: boolean;
}

interface GameHistoryPlayerState {}

export default class GameHistoryPlayer extends React.Component<GameHistoryPlayerProps, GameHistoryPlayerState> {
	constructor(props: GameHistoryPlayerProps, context: any) {
		super(props, context);
	}

	render(): JSX.Element {
		return (<figure className={this.props.won ? "winner" : "loser"}>
			<img src={this.props.cardArt(this.props.heroId)}/>
			<figcaption>{this.props.name}</figcaption>
		</figure>);
	}
}
