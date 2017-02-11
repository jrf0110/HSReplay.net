import * as React from "react";
import CardTile from "./CardTile";

interface CardRankingTableRowProps extends React.ClassAttributes<CardRankingTableRow> {
	card: any;
	popularity: number;
	rank: number;
	delta?: number;
	clickable?: boolean;
}

export default class CardRankingTableRow extends React.Component<CardRankingTableRowProps, any> {
	render(): JSX.Element {
		if (!this.props.card) {
			return null;
		}
		const delta = this.props.delta;
		let cardTile = <CardTile height={34} card={this.props.card} count={1} rarityColored />;
		if (this.props.clickable) {
			cardTile = (
				<a href={"/cards/" + this.props.card.id}>
					{cardTile}
				</a>
			)
		}
		return <tr className="card-table-row">
			<td className="rank-cell" title={this.getTitle()}>
				<span style={{color: delta === 0 ? "black" : (delta > 0 ? "green" : "red")}}>
					{this.getArrow()}
				</span>
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

	getArrow(): string {
		return this.props.delta ? (this.props.delta > 0 ? "▲" : "▼") : "    " ;
	}

	getTitle(): string {
		return this.props.delta ? (this.props.delta > 0 ? "up from yesterday" : "down from yesterday") : "";
	}

	getPopularity() {
		const digits = Math.min(Math.max(0, Math.floor(Math.log10(1 / this.props.popularity))), 2) + 2;
		return (this.props.popularity).toFixed(digits) + "%";
	}
}
