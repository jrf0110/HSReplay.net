import * as React from "react";
import {AutoSizer, Grid} from "react-virtualized";
import { CardObj, SortableProps, SortDirection } from "../../interfaces";
import scrollbarSize from "dom-helpers/util/scrollbarSize";
import SortHeader from "../SortHeader";
import CardTile from "../CardTile";
import {winrateData} from "../../helpers";
import {CardTableColumn} from "./CardTableColumns";
import {CardTableRowData} from "./RowDataGenerator";

interface CardTableProps extends SortableProps, React.ClassAttributes<CardTable> {
	baseWinrate?: number;
	columns: CardTableColumn[];
	rowData: CardTableRowData[];
}

const CELL_HEIGHT = 36;
const MIN_COLUMN_WIDTH = 150;
const MAX_HEADER_WIDTH = 217;
const MIN_HEADER_WIDTH = 150;
const HEADER_SCREEN_RATIO = 0.33;

export default class CardTable extends React.Component<CardTableProps, void> {
	render(): JSX.Element {
		const numColumns = this.props.columns.length;
		const numRows = this.props.rowData.length;
		const totalHeight = CELL_HEIGHT * (numRows + 1) + scrollbarSize();
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
								<div className="grid-container grid-container-left" style={{top: CELL_HEIGHT}}>
									<Grid
										cellRenderer={this.columnHeaderRenderer}
										width={headerWidth}
										height={numRows * CELL_HEIGHT}
										columnCount={1}
										columnWidth={headerWidth}
										rowCount={numRows}
										rowHeight={CELL_HEIGHT}
										style={{outline: "none", overflowY: "hidden"}}
									/>
								</div>
								<div className="grid-container grid-container-top" style={{left: headerWidth}}>
									<Grid
										cellRenderer={this.columnCellRenderer}
										columnCount={numColumns}
										columnWidth={columnWidth}
										height={totalHeight}
										rowCount={numRows + 1}
										rowHeight={CELL_HEIGHT}
										width={width - headerWidth}
										style={{outline: "none", overflowY: "hidden"}}
									/>
								</div>
							</div>
						);
					}}
				</AutoSizer>
			</div>
		);
	}

	columnHeaderRenderer = ({rowIndex, key, style}) => {
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

	columnCellRenderer = ({columnIndex, rowIndex, key, style}) => {
		let content = null;
		let className = null;
		const column = this.props.columns[columnIndex];
		if (rowIndex === 0) {
			content = this.getSortHeader(
				column.sortKey,
				column.text,
				column.defaultSortDirection || "descending",
				column.infoHeader,
				column.infoText,
			);
			className = "card-table-column-header";
		}
		else {
			content = this.props.rowData[rowIndex - 1].values[columnIndex] || (column.winrateData ? "-" : 0);
			className = "card-table-cell";

			if (content !== "-") {
				if (column.winrateData) {
					const wrdata = winrateData(this.props.baseWinrate || 50, +content, 5);
					style["color"] = wrdata.color;
					content = wrdata.tendencyStr + content;
				}
				if (column.percent || column.winrateData) {
					content += "%";
				}
			}
		}

		style["line-height"] = CELL_HEIGHT;
		if (rowIndex % 2 === 1) {
			style["background"] = "white";
		}

		return (
			<div className={className} style={style} key={key}>
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
