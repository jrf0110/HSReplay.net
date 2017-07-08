import * as React from "react";
import { MatchupData } from "../../interfaces";

interface MatchupCellProps extends React.ClassAttributes<MatchupCell> {
	matchupData: MatchupData;
	isIgnored: boolean;
}

interface MatchupCellState {
}

export default class MatchupCell extends React.Component<MatchupCellProps, MatchupCellState> {
	render() {
		return <td style={{backgroundColor: "green"}}>{this.props.matchupData.winrate}%</td>;
	}
}
