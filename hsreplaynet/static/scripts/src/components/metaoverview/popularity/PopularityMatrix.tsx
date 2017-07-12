
import * as React from "react";
import SortHeader from "../../SortHeader";
import CardData from "../../../CardData";
import {AutoSizer, Grid, ScrollSync} from "react-virtualized";
import { ArchetypeRankPopularity, SortDirection } from "../../../interfaces";
import scrollbarSize from "dom-helpers/util/scrollbarSize";
import ColumnHeader from "./ColumnHeader";
import RowHeader from "./RowHeader";
import PopularityCell from "./PopularityCell";
import ColumnFooter from "./ColumnFooter";

interface PopularityMatrixProps extends React.ClassAttributes<PopularityMatrix> {
	archetypes: ArchetypeRankPopularity[];
	cardData: CardData;
	games: number[];
	maxGames: number;
	maxPopuarity: number;
	onSortChanged: (sortBy: string, sortDirection: SortDirection) => void;
	sortBy: string;
	sortDirection: SortDirection;
	numRanks: number;
}

interface PopularityMatrixState {
}

export default class PopularityMatrix extends React.Component<PopularityMatrixProps, PopularityMatrixState> {

	render() {
		const {archetypes} = this.props;

		const headerCellWidth = 250;
		const headerCellHeight = 132;
		const cellWidth = 70;
		const cellHeight = 40;
		const footerCellHeight = cellHeight;

		return (
			<div className="archetype-matrix-container">
				<AutoSizer>
					{({height, width}) => (
						<ScrollSync>
							{({ clientHeight, clientWidth, onScroll, scrollHeight, scrollLeft, scrollTop, scrollWidth }) => (
								<div className="matchup-matrix">
									<div
										className="matchup-header-cell matchup-header-top-left"
										style={{height: headerCellHeight, width: headerCellWidth}}
									>
										{this.getSortHeader("class", "Archetype", "ascending")}
									</div>
									<div className="grid-container grid-container-top" style={{left: headerCellWidth}}>
										<Grid
											cellRenderer={({columnIndex, key, style}) => {
												const archetype = archetypes[0];
												const rankData = archetype.rankData[columnIndex];

												return (
													<ColumnHeader
														rankData={rankData}
														key={key}
														style={style}
														active={this.props.sortBy === "rank" + rankData.rank}
														direction={this.props.sortDirection}
														sortKey={"rank" + rankData.rank}
														onClick={this.props.onSortChanged}
													/>
												);
											}}
											width={width - headerCellWidth - cellWidth - scrollbarSize()}
											height={headerCellHeight}
											columnCount={this.props.numRanks}
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
											"total",
											"Total",
											null,
										)}
									</div>
									<div className="grid-container grid-container-left" style={{top: headerCellHeight}}>
										<Grid
											cellRenderer={({key, rowIndex, style}) => {
												const archetype = archetypes[rowIndex];
												return (
													<RowHeader
														archetypeData={archetype}
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
											rowHeight={cellHeight}
											scrollTop={scrollTop}
											className={"matchup-header"}
										/>
										<div className={"gradient gradient-top" + (scrollTop <= 0 ? " gradient-hidden" : "")}/>
										<div className={"gradient gradient-bottom" + (scrollbarSize() + clientHeight + scrollTop >= scrollHeight ? " gradient-hidden" : "")}/>
									</div>
									<div className="grid-container" style={{top: headerCellHeight, left: headerCellWidth}}>
										<Grid
											cellRenderer={({columnIndex, key, rowIndex, style}) => {
												const archetype = archetypes[rowIndex];
												const rankData = archetype.rankData[columnIndex];
												return (
													<PopularityCell
														key={key}
														style={style}
														popularity={rankData.popularityAtRank}
														maxPopularity={this.props.maxPopuarity}
													/>
												);
											}}
											scrollToAlignment="start"
											scrollToColumn={0}
											scrollToRow={0}
											width={width - headerCellWidth - cellWidth}
											height={height - headerCellHeight - footerCellHeight}
											columnCount={this.props.numRanks}
											columnWidth={cellWidth}
											rowCount={archetypes.length}
											rowHeight={cellHeight}
											scrollTop={scrollTop}
											onScroll={onScroll}
											className={"matchup-matrix"}
										/>
									</div>
									<div className="grid-container grid-container-right" style={{top: headerCellHeight}}>
										<Grid
											cellRenderer={({key, rowIndex, style}) => {
												return (
													<PopularityCell
														key={key}
														style={style}
														popularity={archetypes[rowIndex].totalPopularity}
														maxPopularity={this.props.maxPopuarity}
													/>
												);
											}}
											width={cellWidth}
											height={height - headerCellHeight - footerCellHeight - scrollbarSize()}
											columnCount={1}
											columnWidth={cellWidth}
											rowCount={archetypes.length}
											rowHeight={cellHeight}
											scrollTop={scrollTop}
											className={"matchup-header"}
										/>
									</div>
									<div
										className="matchup-header-cell matchup-header-bottom-left"
										style={{height: footerCellHeight, width: headerCellWidth}}
									>
										<div>Games</div>
									</div>
									<div className="grid-container grid-container-bottom" style={{left: headerCellWidth}}>
										<Grid
											cellRenderer={({columnIndex, key, style}) => (
												<ColumnFooter
													games={this.props.games[columnIndex]}
													maxGames={this.props.maxGames}
													style={style}
												/>
											)}
											width={width - headerCellWidth - cellWidth - scrollbarSize()}
											height={footerCellHeight}
											columnCount={this.props.numRanks}
											columnWidth={cellWidth}
											rowCount={1}
											rowHeight={footerCellHeight}
											scrollLeft={scrollLeft}
											className={"matchup-header"}
										/>
										<div className={"gradient gradient-left" + (scrollLeft <= 0 ? " gradient-hidden" : "")}/>
										<div className={"gradient gradient-right" + (scrollbarSize() + clientWidth + scrollLeft >= scrollWidth ? " gradient-hidden" : "")}/>
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
