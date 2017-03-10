import * as React from "react";
import {TableData, TableQueryData} from "../interfaces";
import CardRankingTableRow from "./CardRankingTableRow";
import {getQueryMapFromLocation} from "../QueryParser";
import {isLoading, isError} from "../helpers";
import CardData from "../CardData";

interface CardRankingTableProps extends React.ClassAttributes<CardRankingTable> {
	tableData: TableData;
	dataKey: string;
	cardData: CardData;
	numRows: number;
	urlGameType: string;
	clickable?: boolean;
}

export default class CardRankingTable extends React.Component<CardRankingTableProps, any> {
	render(): JSX.Element {
		if (isError(this.props.tableData)) {
			return null;
		}

		const cardRows = [];
		if (this.props.cardData && !isLoading(this.props.tableData)) {
			const tableRows = (this.props.tableData as TableQueryData).series.data[this.props.dataKey];
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
					/>
				);
			})
		}
		return <div className="table-wrapper">
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
		</div>;
	}
}
