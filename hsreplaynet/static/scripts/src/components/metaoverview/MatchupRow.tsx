import * as React from "react";
import RowHeader from "./RowHeader";
import MatchupCell from "./MatchupCell";
import { ArchetypeData } from "../../interfaces";
import RowFooter from "./RowFooter";

interface MatchupRowProps extends React.ClassAttributes<MatchupRow> {
	archetypeData: ArchetypeData;
	ignoredColumns: number[];
}

interface MatchupRowState {
}

export default class MatchupRow extends React.Component<MatchupRowProps, MatchupRowState> {
	render() {
		const cells = this.props.archetypeData.matchups.map((matchup) => {
			const isIgnored = this.props.ignoredColumns.indexOf(matchup.opponentId) !== -1;
			return <MatchupCell matchupData={matchup} isIgnored={isIgnored}/>;
		});
		return (
			<tr>
				<RowHeader archetypeData={this.props.archetypeData}/>
				{cells}
				<RowFooter archetypeData={this.props.archetypeData}/>
			</tr>
		);
	}
}
