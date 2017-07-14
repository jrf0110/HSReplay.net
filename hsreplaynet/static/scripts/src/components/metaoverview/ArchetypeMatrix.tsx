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
import ArchetypeSearch from "../ArchetypeSearch";

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
		const {archetypes} = this.props;

		const headerCellWidth = 250;
		const headerCellHeight = 132;
		const cellWidth = 70;
		const cellHeight = 40;
		const footerCellHeight = 80;
		const spacerSize = 5;

		return (
			<div className="archetype-matrix-container">
				<AutoSizer>
					{({height, width}) => (
						<ScrollSync>
							{({ clientHeight, clientWidth, onScroll, scrollHeight, scrollLeft, scrollTop, scrollWidth }) => (
								<div className="matchup-matrix">
									<div
										className="matchup-header-cell matchup-header-top-left matchup-header-archetype"
										style={{height: headerCellHeight, width: headerCellWidth}}
									>
										{this.getSortHeader("class", "Archetype", "ascending")}
										<ArchetypeSearch
											availableArchetypes={archetypes.map((a) => {
												return {
													id: a.id,
													name: a.name,
													player_class: a.playerClass,
												};
											}).sort((a, b) => a.name > b.name ? 1 : -1)}
											onArchetypeSelected={(archetype) => this.props.onFavoriteChanged(archetype.id, true)}
										/>
									</div>
									<div className="grid-container grid-container-top" style={{left: headerCellWidth}}>
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
										<div className={"gradient gradient-left gradient-fade" + (scrollLeft <= 0 ? " gradient-hidden" : "")}/>
										<div className={"gradient gradient-right gradient-fade" + (scrollbarSize() + clientWidth + scrollLeft >= scrollWidth ? " gradient-hidden" : "")}/>
									</div>
									<div
										className="matchup-header-cell matchup-header-top-right"
										style={{height: headerCellHeight, width: cellWidth}}
									>
										{this.getSortHeader(
											"winrate",
											"EWR",
											null,
											"Effective Winrate",
											"The expected winrate against all active archetypes, weighted by their popularity.",
										)}
									</div>
									<div className="grid-container grid-container-left" style={{top: headerCellHeight}}>
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
										<div className={"gradient gradient-top" + (scrollTop <= 0 ? " gradient-hidden" : "")}/>
										<div className={"gradient gradient-bottom" + (scrollbarSize() + clientHeight + scrollTop >= scrollHeight ? " gradient-hidden" : "")}/>
									</div>
									<div className="grid-container" style={{top: headerCellHeight, left: headerCellWidth}}>
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
										className="matchup-header-cell matchup-header-bottom-left matchup-header-popularity"
										style={{height: footerCellHeight, width: headerCellWidth}}
									>
										{this.getSortHeader(
											"popularity",
											"Popularity",
											null,
											"Popularity on Ladder",
											"The percentage of decks played that belong to this archetype.",
										)}
										<label className="custom-weight-checkbox">
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
									<div className="grid-container grid-container-bottom" style={{left: headerCellWidth}}>
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
										<div className={"gradient gradient-left" + (scrollLeft <= 0 ? " gradient-hidden" : "")}/>
										<div className={"gradient gradient-right" + (scrollbarSize() + clientWidth + scrollLeft >= scrollWidth ? " gradient-hidden" : "")}/>
									</div>
									<div className="grid-container grid-container-right" style={{top: headerCellHeight}}>
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
