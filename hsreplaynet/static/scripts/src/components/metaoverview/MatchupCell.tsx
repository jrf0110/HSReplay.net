import * as React from "react";

interface MatchupCellProps extends React.ClassAttributes<MatchupCell> {
}

interface MatchupCellState {
}

export default class MatchupCell extends React.Component<MatchupCellProps, MatchupCellState> {
	render() {
		return <td style={{backgroundColor: "green"}}>75.00%</td>;
	}
}
