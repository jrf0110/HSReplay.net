import * as React from "react";
import {ArchetypeData, SortDirection} from "../../interfaces";
import SortHeader from "../SortHeader";
import CardData from "../../CardData";
import {Grid, ScrollSync, AutoSizer} from "react-virtualized";
import MatchupCell from "./MatchupCell";
import scrollbarSize from 'dom-helpers/util/scrollbarSize'
import ColumnHeader from "./ColumnHeader";

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
		const rows = [];
		const popularities = [];

		const numFavorites = this.props.favorites.length;

		const {archetypes} = this.props;

		/*this.props.archetypes.forEach((archetype: ArchetypeData, index: number) => {
			const isIgnored = this.props.ignoredColumns.indexOf(archetype.id) !== -1;
			const isFavorite = this.props.favorites.indexOf(archetype.id) !== -1;

			// Data is sorted by favorites
			const lastFavorite = index === numFavorites - 1;

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
					isFavorite={isFavorite}
					lastFavorite={lastFavorite}
					ignoredColumns={this.props.ignoredColumns}
					onFavoriteChanged={(favorite: boolean) => this.props.onFavoriteChanged(archetype.id, favorite)}
				/>,
			);
			popularities.push(<ColumnFooter archetypeData={archetype} />);
		});*/

		/*return (
			<table className="archetype-matrix">
				<tr>
					{this.getSortHeader("class", "Archetype", "ascending")}
					{headers}
					{this.getSortHeader(
						"winrate",
						"EWR",
						null,
						"Effective Winrate",
						"The expected winrate against all active archetypes, weighted by their popularity.",
					)}
				</tr>
				<tbody style={{height: "50vh"}}>
					{rows}
				</tbody>
				<tfoot>
					<tr>
						{this.getSortHeader(
							"popularity",
							"Popularity",
							null,
							"Popularity on Ladder",
							"The percentage of decks played that belong to this archetype.",
						)}
						{popularities}
					</tr>
				</tfoot>
			</table>
		);*/

		const headerCellWidth = 150;
		const headerCellHeight = 100;

		const cellWidth = 70;
		const cellHeight = 40;

		return (
			<div style={{height: "calc(100vh - 150px)", margin: "0 15px"}}>
				<AutoSizer>
					{({height, width}) => (
						<ScrollSync>
							{({ clientHeight, clientWidth, onScroll, scrollHeight, scrollLeft, scrollTop, scrollWidth }) => (
								<div className="matchup-matrix">
									<div style={{position: "absolute", top: 0, left: headerCellWidth}}>
										<Grid
											cellRenderer={({columnIndex, key, style}) => {
												return (
													<div className="cell" key={key} style={style}>
														{archetypes[columnIndex].name}
													</div>
												);
											}}
											width={width - headerCellWidth - cellWidth - scrollbarSize()}
											height={headerCellHeight}
											columnCount={archetypes.length}
											columnWidth={cellWidth}
											rowCount={1}
											rowHeight={headerCellHeight}
											scrollLeft={scrollLeft}
											className={"matchup-header-row"}
										/>
									</div>
									<div className="matchup-header-row-cell" style={{position: "absolute", top: 0, right: 0, height: headerCellHeight, width: cellWidth}}>
										EWR
									</div>
									<div style={{position: "absolute", top: headerCellHeight, left: 0}}>
										<Grid
											cellRenderer={({key, rowIndex, style}) => {
												return (
													<div className="cell" key={key} style={style}>
														{archetypes[rowIndex].name}
													</div>
												);
											}}
											width={headerCellWidth}
											height={height - headerCellHeight - cellHeight - scrollbarSize()}
											columnCount={1}
											columnWidth={headerCellWidth}
											rowCount={archetypes.length}
											rowHeight={cellHeight}
											scrollTop={scrollTop}
											className={"matchup-header-column"}
										/>
									</div>
									<div style={{position: "absolute", top: headerCellHeight, left: headerCellWidth}}>
										<Grid
											cellRenderer={({columnIndex, key, rowIndex, style}) => {
												const archetype = archetypes[rowIndex];
												const matchup = archetype.matchups[columnIndex];

												return (
													<MatchupCell key={key} style={style} matchupData={matchup} isIgnored={false} />
												);
											}}
											scrollToAlignment="start"
											scrollToColumn={0}
											scrollToRow={0}
											width={width - headerCellWidth - cellWidth}
											height={height - headerCellHeight - cellHeight}
											columnCount={archetypes.length}
											columnWidth={cellWidth}
											rowCount={archetypes.length}
											rowHeight={cellHeight}
											scrollTop={scrollTop}
											onScroll={onScroll}
											className={"matchup-matrix"}
										/>
									</div>
									<div style={{position: "absolute", bottom: 0, left: headerCellWidth}}>
										<Grid
											cellRenderer={({columnIndex, key, rowIndex, style}) => {
												return (
													<div className="cell" key={key} style={style}>{columnIndex}</div>
												);
											}}
											width={width - headerCellWidth - cellWidth - scrollbarSize()}
											height={cellHeight}
											columnCount={archetypes.length}
											columnWidth={cellWidth}
											rowCount={1}
											rowHeight={cellHeight}
											scrollLeft={scrollLeft}
											className={"matchup-header-row"}
										/>
									</div>
									<div style={{position: "absolute", right: 0, top: headerCellHeight}}>
										<Grid
											cellRenderer={({columnIndex, key, rowIndex, style}) => {
												return (
													<div className="cell" key={key} style={style}>{rowIndex}</div>
												);
											}}
											width={cellWidth}
											height={height - headerCellHeight - cellHeight - scrollbarSize()}
											columnCount={1}
											columnWidth={cellWidth}
											rowCount={archetypes.length}
											rowHeight={cellHeight}
											scrollTop={scrollTop}
											className={"matchup-header-column"}
										/>
									</div>
								</div>
							)}
						</ScrollSync>
					)}
				</AutoSizer>
			</div>
		);
	}

	getSortHeader(
		key: string,
		text: string,
		direction?: SortDirection,
		infoHeader?: string,
		infoText?: string
	): JSX.Element {
		return (
			<SortHeader
				active={this.props.sortBy === key}
				defaultSortDirection={direction || "descending"}
				direction={this.props.sortDirection}
				sortKey={key}
				text={text}
				onClick={this.props.onSortChanged}
				classNames={["text-center"]}
				infoHeader={infoHeader}
				infoText={infoText}
			/>
		);
	}
}
