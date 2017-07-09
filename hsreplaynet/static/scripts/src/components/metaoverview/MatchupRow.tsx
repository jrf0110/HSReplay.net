import * as React from "react";
import RowHeader from "./RowHeader";
import MatchupCell from "./MatchupCell";
import { ArchetypeData } from "../../interfaces";
import RowFooter from "./RowFooter";

interface MatchupRowProps extends React.ClassAttributes<MatchupRow> {
	archetypeData: ArchetypeData;
	ignoredColumns: number[];
	isFavorite: boolean;
	onFavoriteChanged: (favorite: boolean) => void;
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
			<tr className="matchup-row">
				<RowHeader
					archetypeData={this.props.archetypeData}
					isFavorite={this.props.isFavorite}
					onFavoriteClick={() => this.props.onFavoriteChanged(!this.props.isFavorite)}
				/>
				{cells}
				<RowFooter archetypeData={this.props.archetypeData}/>
			</tr>
		);
	}
}
