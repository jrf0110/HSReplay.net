import * as React from "react";
import MatchupRow from "./MatchupRow";
import ColumnHeader from "./ColumnHeader";
import { ArchetypeData, SortDirection } from "../../interfaces";
import ColumnFooter from "./ColumnFooter";
import SortHeader from "../SortHeader";
import CardData from "../../CardData";

interface ArchetypeMatrixProps extends React.ClassAttributes<ArchetypeMatrix> {
	archetypes: ArchetypeData[];
	cardData: CardData;
	favorites: number[];
	ignoredColumns: number[];
	onFavoriteChanged: (archetypeId: number, favorite: boolean) => void;
	onIgnoreChanged: (archetypeId: number, ignore: boolean) => void;
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

		this.props.archetypes.forEach((archetype: ArchetypeData) => {
			const isIgnored = this.props.ignoredColumns.indexOf(archetype.id) !== -1;
			if (this.props.favorites.indexOf(archetype.id) === -1) {
				headers.push(
					<ColumnHeader
						archetypeData={archetype}
						isIgnored={isIgnored}
						onIgnoredChanged={(ignore: boolean) => this.props.onIgnoreChanged(archetype.id, ignore)}
					/>,
				);
				rows.push(
					<MatchupRow
						archetypeData={archetype}
						cardData={this.props.cardData}
						isFavorite={false}
						ignoredColumns={this.props.ignoredColumns}
						onFavoriteChanged={(favorite: boolean) => this.props.onFavoriteChanged(archetype.id, favorite)}
					/>,
				);
				popularities.push(<ColumnFooter archetypeData={archetype} />);
			}
			else {
				favoriteHeaders.push(
					<ColumnHeader
						archetypeData={archetype}
						isIgnored={isIgnored}
						onIgnoredChanged={(ignore: boolean) => this.props.onIgnoreChanged(archetype.id, ignore)}
					/>,
				);
				favoriteRows.push(
					<MatchupRow
						archetypeData={archetype}
						cardData={this.props.cardData}
						isFavorite={true}
						ignoredColumns={this.props.ignoredColumns}
						onFavoriteChanged={(favorite: boolean) => this.props.onFavoriteChanged(archetype.id, favorite)}
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
