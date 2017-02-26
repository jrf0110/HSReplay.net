import * as React from "react";
import CardTile from "./CardTile";

interface CardRankingTableRowProps extends React.ClassAttributes<CardRankingTableRow> {
	card: any;
	popularity: number;
	rank: number;
	clickable?: boolean;
}

export default class CardRankingTableRow extends React.Component<CardRankingTableRowProps, any> {
	render(): JSX.Element {
		if (!this.props.card) {
			return null;
		}
		let cardTile = <CardTile height={34} card={this.props.card} count={1} rarityColored />;
		if (this.props.clickable) {
			cardTile = (
				<a href={"/cards/" + this.props.card.dbfId}>
					{cardTile}
				</a>
			)
		}
		return <tr className="card-table-row">
			<td className="rank-cell">
				{"#" + this.props.rank}
			</td>
			<td>
				<div className="card-wrapper">
					{cardTile}
				</div>
			</td>
			<td style={{lineHeight: "19px", fontWeight: "bold"}}>
				{this.getPopularity()}
			</td>
		</tr>;
	}

	getPopularity() {
		const digits = Math.min(Math.max(0, Math.floor(Math.log10(1 / this.props.popularity))), 2) + 2;
		return (this.props.popularity).toFixed(digits) + "%";
	}
}
