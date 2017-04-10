import * as React from "react";
import CardData from "../CardData";
import {TableData} from "../interfaces";
import CardRankingTableRow from "./CardRankingTableRow";
import {ClickTouch, TooltipContent} from "./Tooltip";
import Fragments from "./Fragments";
import Pager from "./Pager";

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

interface CardRankingTableState {
	page: number;
}

export default class CardRankingTable extends React.Component<CardRankingTableProps, CardRankingTableState> {

	constructor(props, context) {
		super(props, context);
		this.state = {
			page: 1,
		};
	}

	render(): JSX.Element {
		const cardRows = [];
		const tableRows = this.props.data.series.data[this.props.dataKey];
		const hasWinrate = tableRows[0] && tableRows[0].win_rate;
		const rowCount = tableRows.length;
		tableRows.sort((a, b) => +b.popularity - +a.popularity);
		tableRows.slice((this.state.page - 1) * this.props.numRows, (this.state.page * this.props.numRows)).forEach((row, index) => {
			const isFace = +row.dbf_id === -1;
			const card = this.props.cardData.fromDbf(isFace ? 39770 : row.dbf_id);
			const popularity = +row.popularity;
			if (isNaN(popularity) || !popularity) {
				return;
			}
			cardRows.push(
				<CardRankingTableRow
					card={card}
					customCardText={isFace ? "Opponent Hero" : undefined}
					popularity={popularity}
					rank={((this.state.page - 1) * this.props.numRows) + index + 1}
					urlGameType={this.props.urlGameType}
					winrate={hasWinrate ? +row.win_rate : undefined}
					noLink={isFace}
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
			<div className="text-center">
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
				<Pager
					currentPage={this.state.page}
					setCurrentPage={(page: number) => this.setState({page})}
					pageCount={Math.ceil(rowCount / this.props.numRows)}
					minimal
				/>
			</div>
		);
	}
}
