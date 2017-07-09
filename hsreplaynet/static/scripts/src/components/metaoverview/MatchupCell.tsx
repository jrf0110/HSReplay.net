import * as React from "react";
import { MatchupData } from "../../interfaces";
import { toDynamicFixed, getColorString } from "../../helpers";
import {Colors} from "../../Colors";

interface MatchupCellProps extends React.ClassAttributes<MatchupCell> {
	matchupData: MatchupData;
	isIgnored: boolean;
}

interface MatchupCellState {
}

export default class MatchupCell extends React.Component<MatchupCellProps, MatchupCellState> {
	render() {
		let label = "";
		let color = "black";
		let backgroundColor = "white";
		const winrate = this.props.matchupData.winrate || 0;

		if(this.props.matchupData.friendlyId === this.props.matchupData.opponentId) {
			// mirror match
			backgroundColor = getColorString(Colors.HSREPLAY, 50, winrate / 100, true);
		}
		else if(this.props.matchupData.totalGames > 100) {
			// actual matchup
			backgroundColor = getColorString(Colors.HSREPLAY, 50, winrate / 100, false);
			label = `${toDynamicFixed(winrate, 2)}%`;
		}
		else {
			// not enough data
			backgroundColor = "rgb(200,200,200)";
			label = "-";
		}

		if(this.props.isIgnored) {
			backgroundColor = "rgb(200, 200, 200)";
		}

		return (
			<td
				style={{color, backgroundColor}}
			>
				{label}
			</td>
		);
	}
}
