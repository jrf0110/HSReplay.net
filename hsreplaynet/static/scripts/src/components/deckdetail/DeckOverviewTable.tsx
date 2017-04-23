import moment from "moment";
import * as React from "react";
import { TableData } from "../../interfaces";
import { winrateData } from "../../helpers";

interface DeckOverviewTableProps {
	data?: TableData;
	deckId: string;
	playerClass: string;
}

export default class DeckOverviewTable extends React.Component<DeckOverviewTableProps, void> {
	render(): JSX.Element {
		const deck = this.props.data.series.data[this.props.playerClass]
			.find((x) => x.deck_id === this.props.deckId);

		const winrateCell = (winrate: number) => {
			const wrData =  winrateData(50, winrate, 5);
			return (
				<td className="winrate-cell" style={{color: wrData.color}}>
					{winrate.toFixed(2) + "%"}
				</td>
			);
		};

		const secondsPerTurn = deck && (+deck.avg_game_length_seconds / +deck.avg_num_player_turns);

		return (
			<table className="table table-striped table-hover half-table">
				<tbody>
					<tr>
						<td>Winrate</td>
						{deck && winrateCell(deck.win_rate)}
					</tr>
					<tr>
						<td>Match duration</td>
						<td>{deck && moment.duration(+deck.avg_game_length_seconds, "second").asMinutes().toFixed(1) + " minutes"}</td>
					</tr>
					<tr>
						<td>Turns</td>
						<td>{deck && deck.avg_num_player_turns}</td>
					</tr>
					<tr>
						<td>Turn duration</td>
						<td>{deck && moment.duration(secondsPerTurn , "second").asSeconds().toFixed(1) + " seconds"}</td>
					</tr>
				</tbody>
			</table>
		);
	}
}
