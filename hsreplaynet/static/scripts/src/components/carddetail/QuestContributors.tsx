import * as React from "react";
import { TableData } from "../../interfaces";
import CardData from "../../CardData";
import CardTile from "../CardTile";
import { winrateData } from "../../helpers";
import Pager from "../Pager";
import SortableTable, { SortDirection, TableHeader } from "../SortableTable";

interface QuestContributorsState {
	page?: number;
	sortBy?: string;
	sortDirection?: SortDirection;
}

interface QuestContributorsProps {
	cardData: CardData;
	data?: TableData;
}

export default class QuestContributors extends React.Component<QuestContributorsProps, QuestContributorsState> {
	private readonly numRows = 15;

	constructor(props: QuestContributorsProps, state: QuestContributorsState) {
		super(props, state);
		this.state = {
			page: 1,
			sortBy: "popularity",
			sortDirection: "descending",
		};
	}

	render(): JSX.Element {
		let totalRows = 0;
		const rows = [];
		const offset = (this.state.page - 1) * this.numRows;
		if (this.props.data && this.props.cardData) {
			const contributors = this.props.data.series.data["ALL"];
			totalRows = contributors.length;
			const sortDir = this.state.sortDirection === "descending" ? 1 : -1;
			contributors.sort((a, b) => (+b[this.state.sortBy] - +a[this.state.sortBy]) * sortDir);
			contributors.slice(offset, offset + this.numRows).forEach((contributor, index) => {
				const wrData = winrateData(50, contributor.win_rate, 2);
				const winrateCell = (
					<td style={{color: wrData.color}}>{contributor.win_rate + "%"}</td>
				);
				const card = this.props.cardData.fromDbf(contributor.dbf_id);
				rows.push(
					<tr className="card-table-row">
						<td>
							<div className="card-wrapper">
								<CardTile card={card} count={1} height={34} />
							</div>
						</td>
						{winrateCell}
						<td>{contributor.popularity + "%"}</td>
						<td>{contributor.median_turn_completed}</td>
						<td>{contributor.quest_completion_frequency + "%"}</td>
					</tr>,
				);
			});
		}

		const headers: TableHeader[] = [
			{key: "card", text: "Card", sortable: false},
			{key: "win_rate", text: "Winrate"},
			{key: "popularity", text: "Popularity"},
			{key: "median_turn_completed", text: "Avg. Turn"},
			{key: "quest_completion_frequency", text: "Completion Chance"},
		];

		const table = (
			<SortableTable
				headers={headers}
				sortBy={this.state.sortBy}
				sortDirection={this.state.sortDirection}
				onSortChanged={
					(sortBy, sortDirection) => this.setState({sortBy, sortDirection})}
			>
				{rows}
			</SortableTable>
		);

		return (
			<div className="table-wrapper">
				{table}
				<div className="text-center">
					<Pager
						currentPage={this.state.page}
						setCurrentPage={(page: number) => this.setState({page})}
						pageCount={Math.ceil(totalRows / this.numRows)}
						minimal
					/>
				</div>
			</div>
		);
	}
}
