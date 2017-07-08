import * as React from "react";
import MatchupRow from "./MatchupRow";
import ColumnHeader from "./ColumnHeader";
import { ArchetypeData } from "../../interfaces";
import ColumnFooter from "./ColumnFooter";

interface ArchetypeMatrixProps extends React.ClassAttributes<ArchetypeMatrix> {
	archetypes: ArchetypeData[];
}

interface ArchetypeMatrixState {
}

export default class ArchetypeMatrix extends React.Component<ArchetypeMatrixProps, ArchetypeMatrixState> {
	render() {

		const headers = [];
		const rows = [];
		const popularities = [];

		this.props.archetypes.forEach((archetype) => {
			headers.push(<ColumnHeader archetypeData={archetype}/>);
			rows.push(<MatchupRow archetypeData={archetype}/>);
			popularities.push(<ColumnFooter archetypeData={archetype}/>);
		});

		return (
			<table>
				<tr>
					<th>Class</th>
					{headers}
					<th>EWR</th>
				</tr>
				{rows}
				<tr>
					<th>Popularity</th>
					{popularities}
				</tr>
			</table>
		);
	}
}
