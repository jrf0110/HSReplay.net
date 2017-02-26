import * as React from "react";
import {TableData} from "../interfaces";
import CardRankingTableRow from "./CardRankingTableRow";

interface CardRankingTableProps extends React.ClassAttributes<CardRankingTable> {
	tableData: TableData;
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
			tableRows.sort((a, b) => +b["popularity"] - +a["popularity"]);
			tableRows.slice(0, this.props.numRows).forEach((row, index) => {
				const card = this.props.cardData.get(''+row["dbf_id"]);
				cardRows.push(
					<CardRankingTableRow
						card={card}
						popularity={+row["popularity"]}
						rank={index + 1}
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
