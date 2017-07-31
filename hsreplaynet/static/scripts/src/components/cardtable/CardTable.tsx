import * as React from "react";
import {AutoSizer, Grid} from "react-virtualized";
import { CardObj, SortableProps, SortDirection } from "../../interfaces";
import scrollbarSize from "dom-helpers/util/scrollbarSize";
import SortHeader from "../SortHeader";
import CardTile from "../CardTile";
import { winrateData } from "../../helpers";

interface CardTableColumn {
	defaultSortDirection?: SortDirection;
	infoHeader?: string;
	infoText?: string;
	sortKey: string;
	text: string;
	winrateData?: boolean;
}

interface CardTableRowData {
	card: CardObj;
	values: Array<number|string>;
}

interface CardTableProps extends SortableProps, React.ClassAttributes<CardTable> {
	columns: CardTableColumn[];
	rowData: CardTableRowData[];
}

const CELL_HEIGHT = 36;
const MAX_HEADER_WIDTH = 217;
const MIN_HEADER_WIDTH = 150;
const HEADER_SCREEN_RATIO = 0.33;

export default class CardTable extends React.Component<CardTableProps, void> {
	render(): JSX.Element {
		return (
			<div className="card-table-container">
				<AutoSizer>
					{({width}) => {
						const headerWidth = Math.max(MIN_HEADER_WIDTH, Math.min(MAX_HEADER_WIDTH, width  * HEADER_SCREEN_RATIO));
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
										height={CELL_HEIGHT * this.props.rowData.length}
										columnCount={1}
										columnWidth={headerWidth}
										rowCount={this.props.rowData.length}
										rowHeight={CELL_HEIGHT}
										style={{outline: "none"}}
									/>
								</div>
								<div className="grid-container grid-container-top" style={{left: headerWidth}}>
									<Grid
										cellRenderer={this.columnCellRenderer}
										columnCount={this.props.columns.length}
										columnWidth={150}
										height={CELL_HEIGHT * (this.props.rowData.length + 1) + scrollbarSize()}
										rowCount={this.props.rowData.length + 1}
										rowHeight={CELL_HEIGHT}
										width={width - headerWidth}
										style={{outline: "none"}}
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

			if (column.winrateData && content !== "-") {
				const wrdata = winrateData(50, +content, 3);
				style["color"] = wrdata.color;
				content = wrdata.tendencyStr + content + "%";
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
