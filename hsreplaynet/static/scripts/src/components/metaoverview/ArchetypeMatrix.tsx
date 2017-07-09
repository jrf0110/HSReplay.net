import * as React from "react";
import MatchupRow from "./MatchupRow";
import ColumnHeader from "./ColumnHeader";
import { ArchetypeData, SortDirection } from "../../interfaces";
import ColumnFooter from "./ColumnFooter";
import SortHeader from "../SortHeader";

interface ArchetypeMatrixProps extends React.ClassAttributes<ArchetypeMatrix> {
	archetypes: ArchetypeData[];
	favorites: number[];
	ignoredColumns: number[];
	onFavoriteChanged: (archetypeId: number) => void;
	onIgnoredColumnChanged: (archetypeId: number) => void;
	onSortChanged: (sortBy: string, sortDirection: SortDirection) => void;
	sortBy: string;
	sortDirection: SortDirection;
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
					{this.getSortHeader("class", "Archetype", "ascending")}
					{favoriteHeaders}
					{headers}
					{this.getSortHeader("winrate", "Effective Winrate")}
				</tr>
				{favoriteRows}
				{rows}
				<tr>
					{this.getSortHeader("popularity", "Popularity")}
					{favoritePopularities}
					{popularities}
				</tr>
			</table>
		);
	}

	getSortHeader(key: string, text: string, direction?: SortDirection): JSX.Element {
		return (
			<SortHeader
				active={this.props.sortBy === key}
				defaultSortDirection={direction || "descending"}
				direction={this.props.sortDirection}
				sortKey={key}
				text={text}
				onClick={this.props.onSortChanged}
				classNames={["text-center"]}
			/>
		);
	}
}
