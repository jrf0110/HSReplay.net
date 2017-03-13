import * as React from "react";
import CardData from "../CardData";
import {TableData} from "../interfaces";
import {getQueryMapFromLocation} from "../QueryParser";
import CardRankingTableRow from "./CardRankingTableRow";

interface CardRankingTableProps extends React.ClassAttributes<CardRankingTable> {
	data?: TableData;
	dataKey: string;
	cardData: CardData;
	numRows: number;
	urlGameType: string;
	clickable?: boolean;
}

export default class CardRankingTable extends React.Component<CardRankingTableProps, any> {
	render(): JSX.Element {
		const cardRows = [];
		if (this.props.cardData) {
			const tableRows = this.props.data.series.data[this.props.dataKey];
			tableRows.sort((a, b) => +b["popularity"] - +a["popularity"]);
			tableRows.slice(0, this.props.numRows).forEach((row, index) => {
				const isFace = +row["dbf_id"] === -1;
				const card = this.props.cardData.fromDbf(isFace ? 39770 : row["dbf_id"]);
				cardRows.push(
					<CardRankingTableRow
						card={card}
						popularity={+row["popularity"]}
						rank={index + 1}
						clickable={this.props.clickable}
						urlGameType={this.props.urlGameType}
						customCardText={isFace ? "Opponent Hero" : undefined}
					/>,
				);
			});
		}
		return (
			<table className="table table-striped">
				<thead>
				<tr>
					<th>Rank</th>
					<th>Card</th>
					<th className="hidden-xs">Popularity</th>
					<th className="visible-xs">Pop.</th>
				</tr>
				</thead>
				<tbody>
					{cardRows}
				</tbody>
			</table>
		);
	}
}
