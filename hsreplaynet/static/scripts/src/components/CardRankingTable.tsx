import * as React from "react";
import {TableData, TableRow} from "../interfaces";
import CardRankingTableRow from "./CardRankingTableRow";

interface CardRankingTableProps extends React.ClassAttributes<CardRankingTable> {
	tableData: TableData;
	prevTableData?: TableData;
	dataKey: string;
	cardData: Map<string, any>
	numRows: number;
	clickable?: boolean;
}

export default class CardRankingTable extends React.Component<CardRankingTableProps, any> {
	render(): JSX.Element {
		if (this.props.tableData === "error") {
			return null;
		}
		
		const cardRows = [];
		if (this.props.cardData && this.props.tableData !== "loading" && this.props.tableData) {
			const tableRows = this.props.tableData.series.data[this.props.dataKey];
			tableRows.sort((a, b) => +a["rank"] - +b["rank"]);
			tableRows.slice(0, this.props.numRows).forEach(row => {
				const cardid = row["card_id"] || row["dbf_id"];
				const card = this.props.cardData.get(''+cardid);
				cardRows.push(
					<CardRankingTableRow
						card={card}
						popularity={+row["popularity"]}
						rank={+row["rank"]}
						clickable={this.props.clickable}
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
