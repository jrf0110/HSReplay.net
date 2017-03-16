import * as React from "react";
import CardTile from "./CardTile";
import { winrateData } from "../helpers";

interface CardRankingTableRowProps extends React.ClassAttributes<CardRankingTableRow> {
	card: any;
	clickable?: boolean;
	customCardText?: string;
	popularity: number;
	rank: number;
	urlGameType?: string;
	winrate?: number;
}

export default class CardRankingTableRow extends React.Component<CardRankingTableRowProps, any> {
	render(): JSX.Element {
		if (!this.props.card) {
			return null;
		}
		let cardTile = (
			<CardTile
				height={34}
				card={this.props.card}
				count={1}
				rarityColored
				customText={this.props.customCardText}
				tooltip={["HERO", "HERO_POWER"].indexOf(this.props.card.type) === -1}
			/>
		);
		if (this.props.clickable) {
			let url = "/cards/" + this.props.card.dbfId + "/";
			if (this.props.urlGameType) {
				url += "#gameType=" + this.props.urlGameType;
			}
			cardTile = (
				<a href={url}>
					{cardTile}
				</a>
			);
		}

		let winrateCell = null;
		if (this.props.winrate !== undefined) {
			const wrData = winrateData(50, this.props.winrate, 2);
			winrateCell = (
				<td style={{color: wrData.color}}>{this.props.winrate + "%"}</td>
			);
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
			{winrateCell}
		</tr>;
	}

	getPopularity() {
		const digits = Math.min(Math.max(0, Math.floor(Math.log10(1 / this.props.popularity))), 2) + 2;
		return (this.props.popularity).toFixed(digits) + "%";
	}
}
