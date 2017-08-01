import * as React from "react";
import {cardObjSorting, cardSorting, winrateData} from "../../helpers";
import {CardObj, SortDirection, TableData} from "../../interfaces";
import CardTable from "../cardtable/CardTable";
import {CardTableColumn, cardTableColumnData, CardTableColumnKey} from "../cardtable/CardTableColumns";
import {ApiCardStatsData, generateCardTableRowData} from "../cardtable/RowDataGenerator";

interface CardTableContainerProps {
	cards: CardObj[];
	columns: CardTableColumnKey[];
	data?: ApiCardStatsData[];
	onSortChanged: (sortBy: string, sortDirection: SortDirection) => void;
	sortBy: string;
	sortDirection: SortDirection;
}

export default class CardTableContainer extends React.Component<CardTableContainerProps, void> {
	render(): JSX.Element {
		const {cards, data, sortBy, sortDirection} = this.props;

		if (!data) {
			return <h3 className="message-wrapper">Loading...</h3>;
		}

		const columns = this.props.columns.map((key) => cardTableColumnData[key]);
		const rowData = generateCardTableRowData(cards, data, sortBy, sortDirection, columns);

		return (
			<CardTable
				sortBy={sortBy}
				sortDirection={sortDirection}
				onSortChanged={this.props.onSortChanged}
				columns={columns}
				rowData={rowData}
			/>
		);
	}
}
