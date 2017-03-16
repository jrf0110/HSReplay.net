import * as React from "react";
import CardData from "../CardData";
import {TableData} from "../interfaces";
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
		const tableRows = this.props.data.series.data[this.props.dataKey];
		const hasWinrate = tableRows[0] && tableRows[0].win_rate;
		tableRows.sort((a, b) => +b.popularity - +a.popularity);
		tableRows.slice(0, this.props.numRows).forEach((row, index) => {
			const isFace = +row.dbf_id === -1;
			const card = this.props.cardData.fromDbf(isFace ? 39770 : row.dbf_id);
			cardRows.push(
				<CardRankingTableRow
					card={card}
					clickable={this.props.clickable}
					customCardText={isFace ? "Opponent Hero" : undefined}
					popularity={+row.popularity}
					rank={index + 1}
					urlGameType={this.props.urlGameType}
					winrate={hasWinrate ? +row.win_rate : undefined}
				/>,
			);
		});

		return (
			<table className="table table-striped">
				<thead>
				<tr>
					<th>Rank</th>
					<th>Card</th>
					<th>Popularity</th>
					{hasWinrate ? <th>Winrate</th> : null}
				</tr>
				</thead>
				<tbody>
					{cardRows}
				</tbody>
			</table>
		);
	}
}
