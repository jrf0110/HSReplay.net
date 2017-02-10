import * as React from "react";
import CardTile from "./CardTile";

interface DeckTableRowProps extends React.ClassAttributes<DeckTableRow> {
	card: any;
	cardText: string;
	winrate: number;
	deckId: string;
}

export default class DeckTableRow extends React.Component<DeckTableRowProps, any> {
	render(): JSX.Element {
		if (!this.props.card) {
			return null;
		}
		return (
			<tr className="card-table-row">
				<td>
					<div className="card-wrapper">
						<a href={"/cards/decks/" + this.props.deckId}>
							<CardTile height={34} card={this.props.card} count={1} hideGem customText={this.props.cardText} />
						</a>
					</div>
				</td>
				<td style={{lineHeight: "19px", fontWeight: "bold"}}>
					{this.props.winrate}
				</td>
			</tr>
		);
	}
}
