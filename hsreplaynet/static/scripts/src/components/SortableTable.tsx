import * as React from "react";
import InfoIcon from "../components/InfoIcon";

export type SortDirection = "ascending" | "descending";

export interface TableHeader {
	key: string;
	text: string;
	defaultSortDirection?: SortDirection;
	infoHeader?: string;
	infoText?: string;
}

interface SortableTableProps extends React.ClassAttributes<SortableTable> {
	sortBy: string;
	sortDirection: SortDirection;
	onSortChanged: (sortBy: string, sortDirection: SortDirection) => void;
	headers: TableHeader[];
}

export default class SortableTable extends React.Component<SortableTableProps, void> {
	getSortIndicator(key: string): JSX.Element {
		return (
			<span className={key === this.props.sortBy ? "" : "no-sort"}>
				{this.props.sortDirection === "ascending" ? "▴" : "▾"}
			</span>
		);
	};

	render(): JSX.Element {
		const onHeaderClick = (header: TableHeader) => {
			let sortDirection: SortDirection;
			if (this.props.sortBy === header.key) {
				sortDirection = this.props.sortDirection === "ascending" ? "descending" : "ascending";
			}
			else {
				sortDirection = header.defaultSortDirection || "descending";
			}
			this.props.onSortChanged(header.key, sortDirection);
		}

		const headers = this.props.headers.map(header => {
			let info = null;
			if (header.infoText) {
				info = (
					<InfoIcon header={header.infoHeader} content={header.infoText} />
				);
			}
			return (
				<th className="th-sortable" onClick={() => onHeaderClick(header)}>
					{header.text}
					{this.getSortIndicator(header.key)}
					{info}
				</th>
			);
		});

		return (
			<table className="table table-striped table-hover table-sortable">
				<thead>
					<tr>
						{headers}
					</tr>
				</thead>
				<tbody>
					{this.props.children}
				</tbody>
			</table>
		);
	}
}
