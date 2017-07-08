import * as React from "react";
import MatchupRow from "./MatchupRow";
import ColumnHeader from "./ColumnHeader";
import Bar from "./Bar";

interface ArchetypeMatrixProps extends React.ClassAttributes<ArchetypeMatrix> {
}

interface ArchetypeMatrixState {
}

export default class ArchetypeMatrix extends React.Component<ArchetypeMatrixProps, ArchetypeMatrixState> {
	render() {

		const archetypes = [{},{},{},{},{}];

		return (
			<table>
				<tr>
					<th>Class</th>
					{archetypes.map(() => <ColumnHeader />)}
					<th>EWR</th>
				</tr>
				{archetypes.map(() => <MatchupRow />)}
				<tr>
					<th>Popularity</th>
					{archetypes.map(() => (
						<td>
							<Bar total={100} value={50} />
							<br />
							50.00%
						</td>
					))}
				</tr>
			</table>
		);
	}
}
