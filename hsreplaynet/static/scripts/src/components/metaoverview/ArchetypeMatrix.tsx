import MatchupCell from "./MatchupCell";
import * as React from "react";
import SortHeader from "../SortHeader";
import CardData from "../../CardData";
import {AutoSizer, Grid, ScrollSync} from "react-virtualized";
import {ArchetypeData, SortDirection} from "../../interfaces";
import scrollbarSize from "dom-helpers/util/scrollbarSize";
import ColumnHeader from "./ColumnHeader";
import RowHeader from "./RowHeader";
import RowFooter from "./RowFooter";
import ColumnFooter from "./ColumnFooter";

interface ArchetypeMatrixProps extends React.ClassAttributes<ArchetypeMatrix> {
	archetypes: ArchetypeData[];
	cardData: CardData;
	customWeights: any;
	onCustomWeightsChanged: (archetypeId: number, popularity: number) => void;
	useCustomWeights: boolean;
	onUseCustomWeightsChanged: (useCustomPopularities: boolean) => void;
	favorites: number[];
	ignoredColumns: number[];
	maxPopularity?: number;
	onFavoriteChanged: (archetypeId: number, favorite: boolean) => void;
	onIgnoreChanged: (archetypeId: number, ignore: boolean) => void;
	onSortChanged: (sortBy: string, sortDirection: SortDirection) => void;
	sortBy: string;
	sortDirection: SortDirection;
}

interface ArchetypeMatrixState {
}

const offWhite = "#fbf7f6";

export default class ArchetypeMatrix extends React.Component<ArchetypeMatrixProps, ArchetypeMatrixState> {
	private rowHeaders: Grid = null;
	private matchupCells: Grid = null;
	private rowFooters: Grid = null;

	render() {
		const headers = [];
		const rows = [];
		const popularities = [];

		const numFavorites = this.props.favorites.length;

		const {archetypes} = this.props;

		const headerCellWidth = 250;
		const headerCellHeight = 132;

		const cellWidth = 70;
		const cellHeight = 40;

		const footerCellHeight = 80;

		const spacerSize = 5;

		return (
			<div style={{height: "calc(100vh - 150px)", margin: "0 15px"}}>
				<AutoSizer>
					{({height, width}) => (
						<ScrollSync>
							{({ clientHeight, clientWidth, onScroll, scrollHeight, scrollLeft, scrollTop, scrollWidth }) => (
								<div className="matchup-matrix">
									<div className="matchup-header-cell matchup-header-top-left"
										 style={{
											 position: "absolute",
											 top: 0,
											 left: 0,
											 height: headerCellHeight,
											 width: headerCellWidth,
										 }}>
										{this.getSortHeader("class", "Archetype", "ascending")}
									</div>
									<div style={{position: "absolute", top: 0, left: headerCellWidth}}>
										<Grid
											cellRenderer={({columnIndex, key, style}) => {
												const archetype = archetypes[columnIndex];
												const isIgnored = this.props.ignoredColumns.indexOf(archetype.id) !== -1;

												return (
													<ColumnHeader
														archetypeData={archetype}
														isIgnored={isIgnored}
														onIgnoredChanged={(ignore: boolean) =>
															this.props.onIgnoreChanged(archetype.id, ignore)
														}
														key={key}
														style={style}
													/>
												);
											}}
											width={width - headerCellWidth - cellWidth - scrollbarSize()}
											height={headerCellHeight}
											columnCount={archetypes.length}
											columnWidth={cellWidth}
											rowCount={1}
											rowHeight={headerCellHeight}
											scrollLeft={scrollLeft}
											className={"matchup-header"}
										/>
										<div className={"gradient gradient-left gradient-fade" + (scrollLeft <= 0 ? " gradient-hidden" : "")}></div>
										<div className={"gradient gradient-right gradient-fade" + (scrollbarSize() + clientWidth + scrollLeft >= scrollWidth ? " gradient-hidden" : "")}></div>
									</div>
									<div className="matchup-header-cell matchup-header-top-right"
										 style={{
											 position: "absolute",
											 top: 0,
											 right: 0,
											 height: headerCellHeight,
											 width: cellWidth,
										 }}>
										{this.getSortHeader(
											"winrate",
											"EWR",
											null,
											"Effective Winrate",
											"The expected winrate against all active archetypes, weighted by their popularity.",
										)}
									</div>
									<div style={{position: "absolute", top: headerCellHeight, left: 0}}>
										<Grid
											cellRenderer={({key, rowIndex, style}) => {
												const archetype = archetypes[rowIndex];
												const isFavorite = this.props.favorites.indexOf(archetype.id) !== -1;

												if (this.isLastFavorite(rowIndex)) {
													style["border-bottom"] = spacerSize + "px solid " + offWhite;
												}

												return (
													<RowHeader
														archetypeData={archetype}
														isFavorite={isFavorite}
														onFavoriteChanged={(favorite: boolean) => {
															this.props.onFavoriteChanged(archetype.id, favorite);
															this.recomputeGridSize();
														}}
														cardData={this.props.cardData}
														key={key}
														style={style}
													/>
												);
											}}
											width={headerCellWidth}
											height={height - headerCellHeight - footerCellHeight - scrollbarSize()}
											columnCount={1}
											columnWidth={headerCellWidth}
											rowCount={archetypes.length}
											rowHeight={({index}) => cellHeight + (this.isLastFavorite(index) ? spacerSize : 0)}
											scrollTop={scrollTop}
											className={"matchup-header"}
											ref={(ref) => this.rowHeaders = ref}
										/>
										<div className={"gradient gradient-top" + (scrollTop <= 0 ? " gradient-hidden" : "")}></div>
										<div className={"gradient gradient-bottom" + (scrollbarSize() + clientHeight + scrollTop >= scrollHeight ? " gradient-hidden" : "")}></div>
									</div>
									<div style={{position: "absolute", top: headerCellHeight, left: headerCellWidth}}>
										<Grid
											cellRenderer={({columnIndex, key, rowIndex, style}) => {
												const archetype = archetypes[rowIndex];
												const matchup = archetype.matchups[columnIndex];
												const isIgnored = this.props.ignoredColumns.indexOf(matchup.opponentId) !== -1;
												const hasNoCustomData = this.props.useCustomWeights
													&& !this.props.customWeights[matchup.opponentId];

												if (this.isLastFavorite(rowIndex)) {
													style["border-bottom"] = spacerSize + "px solid " + offWhite;
												}

												return (
													<MatchupCell
														key={key}
														style={style}
														matchupData={matchup}
														isIgnored={isIgnored || hasNoCustomData}
													/>
												);
											}}
											scrollToAlignment="start"
											scrollToColumn={0}
											scrollToRow={0}
											width={width - headerCellWidth - cellWidth}
											height={height - headerCellHeight - footerCellHeight}
											columnCount={archetypes.length}
											columnWidth={cellWidth}
											rowCount={archetypes.length}
											rowHeight={({index}) => cellHeight + (this.isLastFavorite(index) ? spacerSize : 0)}
											scrollTop={scrollTop}
											onScroll={onScroll}
											className={"matchup-matrix"}
											ref={(ref) => this.matchupCells = ref}
										/>
									</div>
									<div
										className="matchup-header-cell matchup-header-bottom-left"
										style={{
											position: "absolute",
											bottom: 0,
											left: 0,
											height: footerCellHeight,
											width: headerCellWidth,
											display: "flex",
											flexDirection: "column",
											verticalAlign: "middle",
											justifyContent: "center",
										}}
									>
										{this.getSortHeader(
											"popularity",
											"Popularity",
											null,
											"Popularity on Ladder",
											"The percentage of decks played that belong to this archetype.",
										)}
										<label style={{marginTop: "1px"}}>
											<input
												type="checkbox"
												onChange={
													() => this.props.onUseCustomWeightsChanged(!this.props.useCustomWeights)
												}
												checked={this.props.useCustomWeights}
											/>
											&nbsp;Custom&nbsp;weights
										</label>
									</div>
									<div style={{position: "absolute", bottom: 0, left: headerCellWidth}}>
										<Grid
											cellRenderer={({columnIndex, key, style}) => {
												const archetype = archetypes[columnIndex];
												return (
													<ColumnFooter
														archetypeData={archetype}
														max={this.props.maxPopularity}
														style={style}
														customWeight={this.props.customWeights[archetype.id] || 0}
														useCustomWeight={this.props.useCustomWeights}
														onCustomWeightChanged={(popularity: number) => {
															this.props.onCustomWeightsChanged(archetype.id, popularity);
														}}
													/>
												);
											}}
											width={width - headerCellWidth - cellWidth - scrollbarSize()}
											height={footerCellHeight}
											columnCount={archetypes.length}
											columnWidth={cellWidth}
											rowCount={1}
											rowHeight={footerCellHeight}
											scrollLeft={scrollLeft}
											className={"matchup-header"}
										/>
										<div className={"gradient gradient-left" + (scrollLeft <= 0 ? " gradient-hidden" : "")}></div>
										<div className={"gradient gradient-right" + (scrollbarSize() + clientWidth + scrollLeft >= scrollWidth ? " gradient-hidden" : "")}></div>
									</div>
									<div style={{position: "absolute", right: 0, top: headerCellHeight}}>
										<Grid
											cellRenderer={({key, rowIndex, style}) => {
												if (this.isLastFavorite(rowIndex)) {
													style["border-bottom"] = spacerSize + "px solid " + offWhite;
												}
												return (
													<RowFooter
														archetypeData={archetypes[rowIndex]}
														key={key}
														style={style}
													/>
												);
											}}
											width={cellWidth}
											height={height - headerCellHeight - footerCellHeight - scrollbarSize()}
											columnCount={1}
											columnWidth={cellWidth}
											rowCount={archetypes.length}
											rowHeight={({index}) => cellHeight + (this.isLastFavorite(index) ? spacerSize : 0)}
											scrollTop={scrollTop}
											className={"matchup-header"}
											ref={(ref) => this.rowFooters = ref}
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

	recomputeGridSize() {
		this.rowHeaders && this.rowHeaders.recomputeGridSize();
		this.matchupCells && this.matchupCells.recomputeGridSize();
		this.rowFooters && this.rowFooters.recomputeGridSize();
	}

	isLastFavorite(index: number) {
		return index === this.props.favorites.length - 1;
	}

	getSortHeader(
		key: string,
		text: string,
		direction?: SortDirection,
		infoHeader?: string,
		infoText?: string,
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
				element={<div />}
			/>
		);
	}
}
