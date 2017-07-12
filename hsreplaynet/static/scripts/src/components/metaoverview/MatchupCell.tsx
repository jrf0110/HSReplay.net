import * as React from "react";
import { MatchupData } from "../../interfaces";
import { getColorString, toDynamicFixed } from "../../helpers";
import {Colors} from "../../Colors";
import Tooltip from "../Tooltip";

interface MatchupCellProps extends React.ClassAttributes<MatchupCell> {
	matchupData: MatchupData;
	isIgnored: boolean;
}

interface MatchupCellState {
}

export default class MatchupCell extends React.Component<MatchupCellProps, MatchupCellState> {
	render() {
		let label: string|JSX.Element = "";
		let color = "black";
		let backgroundColor = "white";
		const winrate = this.props.matchupData.winrate || 0;
		const classNames = [];

		if (this.props.matchupData.friendlyId === this.props.matchupData.opponentId) {
			// mirror match
			label = <Tooltip content="Mirror&nbsp;matchup" simple>⟋</Tooltip>;
			backgroundColor = "rgb(200,200,200)";
		}
		else if (this.props.matchupData.totalGames > 100) {
			// actual matchup
			backgroundColor = getColorString(Colors.HSREPLAY, 50, winrate / 100, false);
			label = (
				<Tooltip
					simple
					content={(
						<table>
							<tr>
								<th>Winrate:</th>
								<td>{toDynamicFixed(winrate, 2)}%</td>
							</tr>
							<tr>
								<th>Games:</th>
								<td>{this.props.matchupData.totalGames}</td>
							</tr>
						</table>
					)}
				>
					{`${winrate.toFixed(2)}%`}
				</Tooltip>
			);
		}
		else {
			// not enough data
			label = <Tooltip content="Not enough games" simple>~</Tooltip>;
			backgroundColor = "rgb(200,200,200)";
		}

		if (this.props.isIgnored) {
			classNames.push("ignored");
		}

		return (
			<td
				className={classNames.join(" ")}
				style={{color, backgroundColor}}
			>
				{label}
			</td>
		);
	}
}
