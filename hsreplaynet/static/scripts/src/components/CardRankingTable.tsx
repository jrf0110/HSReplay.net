import * as React from "react";
import CardData from "../CardData";
import {TableData} from "../interfaces";
import CardRankingTableRow from "./CardRankingTableRow";
import {ClickTouch, TooltipContent} from "./Tooltip";

interface TooltipMap<T> {
	rank?: T;
	card?: T;
	popularity?: T;
	winrate?: T;
}

interface CardRankingTableProps extends React.ClassAttributes<CardRankingTable> {
	data?: TableData;
	dataKey: string;
	cardData: CardData;
	numRows: number;
	urlGameType: string;
	tooltips?: TooltipMap<JSX.Element>;
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
					customCardText={isFace ? "Opponent Hero" : undefined}
					popularity={+row.popularity}
					rank={index + 1}
					urlGameType={this.props.urlGameType}
					winrate={hasWinrate ? +row.win_rate : undefined}
				/>,
			);
		});

		const tooltip = (key: keyof TooltipMap<any>): JSX.Element|null => {
			if (!this.props.tooltips) {
				return null;
			}
			if (!this.props.tooltips[key]) {
				return null;
			}
			return this.props.tooltips[key];
		}

		return (
			<table className="table table-striped">
				<thead>
				<tr>
					<th>Rank{tooltip("rank")}</th>
					<th>Card{tooltip("card")}</th>
					<th>Popularity{tooltip("popularity")}</th>
					{hasWinrate ? <th>Winrate{tooltip("winrate")}</th> : null}
				</tr>
				</thead>
				<tbody>
					{cardRows}
				</tbody>
			</table>
		);
	}
}
