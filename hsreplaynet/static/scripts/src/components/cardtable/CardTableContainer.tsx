import * as React from "react";
import {cardObjSorting, cardSorting, winrateData} from "../../helpers";
import {CardObj, SortDirection, TableData} from "../../interfaces";
import CardTable from "../cardtable/CardTable";
import {CardTableColumn, cardTableColumnData, CardTableColumnKey} from "../cardtable/CardTableColumns";
import {ApiCardStatsData, generateCardTableRowData} from "../cardtable/RowDataGenerator";
import loadingHandler from "../loading/Loading";

interface CardTableContainerProps {
	baseWinrate?: number;
	cards: CardObj[];
	columns: CardTableColumnKey[];
	data?: ApiCardStatsData[];
	onSortChanged: (sortBy: string, sortDirection: SortDirection) => void;
	sortBy: string;
	sortDirection: SortDirection;
	numCards?: number;
	topInfoRow?: JSX.Element;
	bottomInfoRow?: JSX.Element;
}

class CardTableContainer extends React.Component<CardTableContainerProps, void> {
	render(): JSX.Element {
		const {baseWinrate, cards, data, sortBy, sortDirection, numCards} = this.props;

		const columns = this.props.columns.map((key) => cardTableColumnData[key]);
		let rowData = generateCardTableRowData(cards, data, sortBy, sortDirection, columns);
		if (numCards !== undefined) {
			rowData = rowData.slice(0, numCards);
		}

		return (
			<CardTable
				baseWinrate={baseWinrate}
				sortBy={sortBy}
				sortDirection={sortDirection}
				onSortChanged={this.props.onSortChanged}
				columns={columns}
				rowData={rowData}
				topInfoRow={this.props.topInfoRow}
				bottomInfoRow={this.props.bottomInfoRow}
			/>
		);
	}
}

export default loadingHandler(CardTableContainer);
