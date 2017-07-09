import * as React from "react";
import MatchupRow from "./MatchupRow";
import ColumnHeader from "./ColumnHeader";
import { ArchetypeData } from "../../interfaces";
import ColumnFooter from "./ColumnFooter";

interface ArchetypeMatrixProps extends React.ClassAttributes<ArchetypeMatrix> {
	archetypes: ArchetypeData[];
	favorites: number[];
	ignoredColumns: number[];
	onFavoriteChanged: (archetypeId: number) => void;
	onIgnoredColumnChanged: (archetypeId: number) => void;
}

interface ArchetypeMatrixState {
}

export default class ArchetypeMatrix extends React.Component<ArchetypeMatrixProps, ArchetypeMatrixState> {
	render() {

		const headers = [];
		const favoriteHeaders = [];
		const rows = [];
		const favoriteRows = [];
		const popularities = [];
		const favoritePopularities = [];

		this.props.archetypes.forEach((archetype) => {
			const isIgnored = this.props.ignoredColumns.indexOf(archetype.id) !== -1;
			if (this.props.favorites.indexOf(archetype.id) === -1) {
				headers.push(
					<ColumnHeader
						archetypeData={archetype}
						isIgnored={isIgnored}
						onIgnoredChanged={this.props.onIgnoredColumnChanged}
					/>,
				);
				rows.push(
					<MatchupRow
						archetypeData={archetype}
						isFavorite={false}
						ignoredColumns={this.props.ignoredColumns}
						onFavoriteChanged={this.props.onFavoriteChanged}
					/>,
				);
				popularities.push(<ColumnFooter archetypeData={archetype} />);
			}
			else {
				favoriteHeaders.push(
					<ColumnHeader
						archetypeData={archetype}
						isIgnored={isIgnored}
						onIgnoredChanged={this.props.onIgnoredColumnChanged}
					/>,
				);
				favoriteRows.push(
					<MatchupRow
						archetypeData={archetype}
						isFavorite={true}
						ignoredColumns={this.props.ignoredColumns}
						onFavoriteChanged={this.props.onFavoriteChanged}
					/>,
				);
				favoritePopularities.push(<ColumnFooter archetypeData={archetype} />);
			}
		});

		return (
			<table className="archetype-matrix">
				<tr>
					<th>Class</th>
					{favoriteHeaders}
					{headers}
					<th>EWR</th>
				</tr>
				{favoriteRows}
				{rows}
				<tr>
					<th>Popularity</th>
					{favoritePopularities}
					{popularities}
				</tr>
			</table>
		);
	}
}
