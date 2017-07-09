import * as React from "react";
import { MatchupData } from "../../interfaces";
import { toDynamicFixed, getColorString } from "../../helpers";
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

		if(this.props.matchupData.friendlyId === this.props.matchupData.opponentId) {
			// mirror match
			label = <Tooltip content="Mirror&nbsp;matchup" simple>⟋</Tooltip>;
			backgroundColor = "rgb(200,200,200)";
		}
		else if(this.props.matchupData.totalGames > 100) {
			// actual matchup
			backgroundColor = getColorString(Colors.HSREPLAY, 50, winrate / 100, false);
			label = `${toDynamicFixed(winrate, 2)}%`;
		}
		else {
			// not enough data
			label = "~";
			backgroundColor = "rgb(200,200,200)";
		}

		if(this.props.isIgnored) {
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
