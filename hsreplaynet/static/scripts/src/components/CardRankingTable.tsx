import * as React from "react";
import {TableRow} from "../interfaces";
import CardRankingTableRow from "./CardRankingTableRow";

interface CardRankingTableProps extends React.ClassAttributes<CardRankingTable> {
	cardData: Map<string, any>
	tableRows: TableRow[];
	numRows: number;
	previousTableRows?: TableRow[];
	clickable?: boolean;
}

export default class CardRankingTable extends React.Component<CardRankingTableProps, any> {
	render(): JSX.Element {
		const cardRows = [];
		if (this.props.cardData && this.props.tableRows) {
			this.props.tableRows.slice(0, this.props.numRows).forEach(row => {
				const cardid = row["card_id"] || row["dbf_id"] || row["entity_dbf_id"] || row["target_entity_dbf_id"];
				const card = this.props.cardData.get(''+cardid);
				cardRows.push(
					<CardRankingTableRow
						card={card}
						popularity={+row["popularity"]}
						rank={+row["rank"]}
						delta={this.getDelta(row)}
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

	getDelta(row: TableRow) {
		if (this.props.previousTableRows) {
			const prev = this.props.previousTableRows.find(prev => prev["card_id"] == row["card_id"]);
			if (prev) {
				return +prev["rank"] - +row["rank"];
			}
		}
		return 0;
	}

}
