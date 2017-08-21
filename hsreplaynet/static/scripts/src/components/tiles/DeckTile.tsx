import * as React from "react";
import {winrateData} from "../../helpers";
import CardIcon from "../CardIcon";

interface DeckTileProps extends React.ClassAttributes<DeckTile> {
	cards?: any[];
	deckId?: string;
	games?: number;
	title: string;
	winrate?: number;
}

export default class DeckTile extends React.Component<DeckTileProps, {}> {
	render(): JSX.Element {
		let content = null;
		if (this.props.cards && this.props.deckId && this.props.games !== undefined && this.props.winrate !== undefined) {
			const cardIcons = this.props.cards.map((card) => <CardIcon card={card} size={50}/>);
			const wrData = winrateData(50, this.props.winrate, 3);
			content = [
				<div className="tech-cards">
					{cardIcons}
				</div>,
				<div className="stats-table">
					<table>
						<tr>
							<th>Winrate:</th>
							<td style={{color: wrData.color}}>{this.props.winrate}%</td>
						</tr>
						<tr>
							<th>Games:</th>
							<td>{this.props.games}</td>
						</tr>
					</table>
				</div>,
			];
		}

		return (
			<div className="col-xs-12 col-sm-6 col-md-4 col-lg-3">
				<a className="tile deck-tile" href={`/decks/${this.props.deckId}/`}>
					<div className="tile-title">
						{this.props.title}
					</div>
					<div className="tile-content">
						{content}
					</div>
				</a>
			</div>
		);
	}
}
