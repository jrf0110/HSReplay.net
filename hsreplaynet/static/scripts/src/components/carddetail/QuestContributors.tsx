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
			{
				key: "card",
				text: "Contributor",
				sortable: false,
				infoHeader: "Contributor",
				infoText: [
					<p>Cards that contributed to the completion of this quest in some way.</p>,
					<br/>,
					<strong>Created cards:</strong>,
					<p>
						Created cards count towards their source:
						e.g. Fireballs created by Archmage Antonidas
						will count towards the Archmage, rather than Fireball.
					</p>,
					<br/>,
					<strong>The Caverns Below (Rogue):</strong>,
					<p>All progress ticks are included, not just the ones that eventually complete the Quest.</p>,
				],
			},
			{
				key: "win_rate",
				text: "Played Winrate",
				infoHeader: "Played Winrate",
				infoText: "Average winrate of games where the card contributed to the quest.",
			},
			{
				key: "popularity",
				text: "Popularity",
				infoHeader: "Popularity",
				infoText: "Total percentage of quest progress made by the card.",
			},
			{
				key: "median_turn_completed",
				text: "Median Turn",
				infoHeader: "Median Turn Completed",
				infoText: "Turn this quest is most commonly completed on when the card contributed the progress.",
			},
			{
				key: "quest_completion_frequency",
				text: "Completed",
				infoHeader: "Completion Frequency",
				infoText: "Frequency of this quest being completed when the card contributed to the progress.",
			},
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
					/>
				</div>
			</div>
		);
	}
}
