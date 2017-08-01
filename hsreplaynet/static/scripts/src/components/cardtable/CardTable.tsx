import * as React from "react";
import {AutoSizer, Grid, ScrollSync} from "react-virtualized";
import { CardObj, SortableProps, SortDirection } from "../../interfaces";
import scrollbarSize from "dom-helpers/util/scrollbarSize";
import SortHeader from "../SortHeader";
import CardTile from "../CardTile";
import {toDynamicFixed, toPrettyNumber, winrateData} from "../../helpers";
import {CardTableColumn} from "./CardTableColumns";
import {CardTableRowData} from "./RowDataGenerator";

interface CardTableProps extends SortableProps, React.ClassAttributes<CardTable> {
	baseWinrate?: number;
	columns: CardTableColumn[];
	rowData: CardTableRowData[];
	topInfoRow?: JSX.Element;
	bottomInfoRow?: JSX.Element;
}

const CELL_HEIGHT = 36;
const MIN_COLUMN_WIDTH = 150;
const MAX_HEADER_WIDTH = 217;
const MIN_HEADER_WIDTH = 150;
const HEADER_SCREEN_RATIO = 0.33;
const INFO_ROW_HEIGHT = 50;

export default class CardTable extends React.Component<CardTableProps, void> {
	render(): JSX.Element {
		const {topInfoRow, bottomInfoRow} = this.props;
		const numColumns = this.props.columns.length;
		const numRows = this.props.rowData.length;
		const topOffset =  topInfoRow ? INFO_ROW_HEIGHT : 0;
		const bottomOffset = bottomInfoRow ? INFO_ROW_HEIGHT : 0;
		const totalHeight = CELL_HEIGHT * (numRows + 1) + scrollbarSize() + topOffset + bottomOffset;
		return (
			<div className="card-table-container" style={{height: totalHeight}}>
				<AutoSizer>
					{({width}) => {
						const headerWidth = Math.max(MIN_HEADER_WIDTH, Math.min(MAX_HEADER_WIDTH, width  * HEADER_SCREEN_RATIO));
						const requiredWith = headerWidth + MIN_COLUMN_WIDTH * numColumns;
						let columnWidth = MIN_COLUMN_WIDTH;
						if (requiredWith < width) {
							columnWidth = Math.max(MIN_COLUMN_WIDTH, (width - headerWidth) / numColumns);
						}
						return (
							<ScrollSync>
								{({onScroll, scrollLeft}) => (
									<div className="">
										<div className="grid-container grid-container-top grid-container-left">
											<div
												className="card-table-column-header"
												style={{
													lineHeight: (CELL_HEIGHT - 1) + "px",
													textAlign: "center",
													width: headerWidth,
												}}
											>
												{this.getSortHeader("card", "Card", "ascending")}
											</div>
										</div>
										{this.renderInfoRow(topInfoRow, width, CELL_HEIGHT)}
										{this.renderInfoRow(bottomInfoRow, width, totalHeight - INFO_ROW_HEIGHT - scrollbarSize())}
										<div className="grid-container grid-container-top" style={{left: headerWidth}}>
											<Grid
												cellRenderer={this.columnHeaderRenderer}
												columnCount={numColumns}
												columnWidth={columnWidth}
												height={CELL_HEIGHT}
												rowCount={1}
												rowHeight={CELL_HEIGHT}
												width={width - headerWidth}
												scrollLeft={scrollLeft}
												className="card-table-grid card-table-header"
												style={{}}
											/>
										</div>
										<div className="grid-container grid-container-left" style={{top: CELL_HEIGHT + topOffset}}>
											<Grid
												cellRenderer={this.rowHeaderRenderer}
												width={headerWidth}
												height={numRows * CELL_HEIGHT}
												columnCount={1}
												columnWidth={headerWidth}
												rowCount={numRows}
												rowHeight={CELL_HEIGHT}
												className="card-table-grid"
												style={{}}
											/>
										</div>
										<div className="grid-container" style={{top: CELL_HEIGHT + topOffset, left: headerWidth}}>
											<Grid
												cellRenderer={this.columnCellRenderer}
												columnCount={numColumns}
												columnWidth={columnWidth}
												height={totalHeight - CELL_HEIGHT - topOffset}
												rowCount={numRows}
												rowHeight={CELL_HEIGHT}
												width={width - headerWidth}
												onScroll={onScroll}
												scrollLeft={scrollLeft}
												className="card-table-grid"
												style={{}}
											/>
										</div>
									</div>
								)}
							</ScrollSync>
						);
					}}
				</AutoSizer>
			</div>
		);
	}

	renderInfoRow(infoRow: JSX.Element, width: number, top: number): JSX.Element {
		if (!infoRow) {
			return null;
		}
		return (
			<div className="grid-container grid-container-left" style={{top, width: width + "px"}}>
				{infoRow}
			</div>
		);
	}

	rowHeaderRenderer = ({rowIndex, key, style}) => {
		const {card} = this.props.rowData[rowIndex];
		if (rowIndex % 2 === 0) {
			style["background"] = "white";
		}
		return (
			<div className="card-table-row-header" style={style}>
				<CardTile key={key} card={card.card} count={card.count} height={CELL_HEIGHT - 2}/>
			</div>
		);
	}

	columnHeaderRenderer = ({columnIndex, key, style}) => {
		const column = this.props.columns[columnIndex];
		const content = this.getSortHeader(
			column.sortKey,
			column.text,
			column.defaultSortDirection || "descending",
			column.infoHeader,
			column.infoText,
		);
		style["line-height"] = CELL_HEIGHT;
		return (
			<div className="card-table-column-header" style={style} key={key}>
				{content}
			</div>
		);
	}

	columnCellRenderer = ({columnIndex, rowIndex, key, style}) => {
		const column = this.props.columns[columnIndex];
		const rowValues = this.props.rowData[rowIndex].values;
		let content = rowValues[columnIndex];
		if (content === null || content === undefined) {
			content = (column.winrateData ? "-" : 0);
		}

		if (content !== "-") {
			if (column.winrateData) {
				const wrdata = winrateData(this.props.baseWinrate || 50, +content, 5);
				style["color"] = wrdata.color;
				content = wrdata.tendencyStr + toDynamicFixed(+content) + "%";
			}
			else if (column.percent) {
				content = toDynamicFixed(+content) + "%";
			}
			else if (column.prettify) {
				content = toPrettyNumber(+content);
			}
		}

		style["line-height"] = CELL_HEIGHT;
		if (rowIndex % 2 === 0) {
			style["background"] = "white";
		}

		return (
			<div className="card-table-cell" style={style} key={key}>
				{content}
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
