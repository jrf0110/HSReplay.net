import * as React from "react";
import MatchupRow from "./MatchupRow";
import ColumnHeader from "./ColumnHeader";
import { ArchetypeData } from "../../interfaces";
import ColumnFooter from "./ColumnFooter";

interface ArchetypeMatrixProps extends React.ClassAttributes<ArchetypeMatrix> {
	archetypes: ArchetypeData[];
	favorites: number[];
	ignoredColumns: number[];
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
				headers.push(<ColumnHeader archetypeData={archetype} isFavorite={false} isIgnored={isIgnored}/>);
				rows.push(<MatchupRow archetypeData={archetype} ignoredColumns={this.props.ignoredColumns} />);
				popularities.push(<ColumnFooter archetypeData={archetype} />);
			}
			else {
				favoriteHeaders.push(<ColumnHeader archetypeData={archetype} isFavorite={true} isIgnored={isIgnored}/>);
				favoriteRows.push(<MatchupRow archetypeData={archetype} ignoredColumns={this.props.ignoredColumns} />);
				favoritePopularities.push(<ColumnFooter archetypeData={archetype} />);
			}
		});

		return (
			<table>
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
