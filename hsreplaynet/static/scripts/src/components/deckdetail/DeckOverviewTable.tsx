import * as moment from "moment";
import * as React from "react";
import { TableData } from "../../interfaces";
import { toTitleCase, winrateData } from "../../helpers";

interface DeckOverviewTableProps {
	opponentWinrateData?: TableData;
	deckListData?: TableData;
	deckId: string;
	playerClass: string;
}

export default class DeckOverviewTable extends React.Component<DeckOverviewTableProps, {}> {
	render(): JSX.Element {
		const deck = this.props.deckListData.series.data[this.props.playerClass]
			.find((x) => x.deck_id === this.props.deckId);

		const winrateCell = (winrate: number, baseWinrate: number, tendency: boolean) => {
			const wrData =  winrateData(baseWinrate, winrate, 5);
			return (
				<td className="winrate-cell" style={{color: wrData.color}}>
					{tendency && wrData.tendencyStr}
					{winrate.toFixed(2) + "%"}
				</td>
			);
		};

		const secondsPerTurn = deck && Math.round(+deck.avg_game_length_seconds / (+deck.avg_num_player_turns * 2));

		const opponents = this.props.opponentWinrateData.series.data;
		const rows = [];
		Object.keys(opponents).forEach((opponent) => {
			const oppData = opponents[opponent][0];
			if (oppData) {
				rows.push({opponent, winrate: oppData.winrate});
			}
		});
		rows.sort((a, b) => a.opponent > b.opponent ? 1 : -1);
		const winrates = rows.map((row) => {
			return (
				<tr>
					<td>
						vs.&nbsp;
						<span className={"player-class " + row.opponent.toLowerCase()}>
							{toTitleCase(row.opponent)}
						</span>
					</td>
					{winrateCell(row.winrate, deck.win_rate, true)}
				</tr>
			);
		});

		return (
			<table className="table table-striped table-hover half-table">
				<tbody>
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
						<td>{deck && (secondsPerTurn + " seconds")}</td>
					</tr>
					<tr>
						<td>Overall winrate</td>
						{deck && winrateCell(deck.win_rate, 50, false)}
					</tr>
					{winrates}
				</tbody>
			</table>
		);
	}
}
