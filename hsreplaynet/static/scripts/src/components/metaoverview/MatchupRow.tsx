import * as React from "react";
import RowHeader from "./RowHeader";
import MatchupCell from "./MatchupCell";
import Bar from "./Bar";

interface MatchupRowProps extends React.ClassAttributes<MatchupRow> {
}

interface MatchupRowState {
}

export default class MatchupRow extends React.Component<MatchupRowProps, MatchupRowState> {
	render() {
		const matchups = [{},{},{},{},{}];

		return (
			<tr>
				<RowHeader />
				{matchups.map((matchup) => <MatchupCell />)}
				<td>
					<Bar total={100} value={50} />
					<br />
					100.00%
				</td>
			</tr>
		);
	}
}
