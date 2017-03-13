import * as React from "react";
import InfoIcon from "./InfoIcon";
import SortIndicator from "./SortIndicator";

export type SortDirection = "ascending" | "descending";

export interface TableHeader {
	key: string;
	text: string;
	defaultSortDirection?: SortDirection;
	infoHeader?: string;
	infoText?: string;
	sortable?: boolean;
}

interface SortableTableProps extends React.ClassAttributes<SortableTable> {
	sortBy: string;
	sortDirection: SortDirection;
	onSortChanged?: (sortBy: string, sortDirection: SortDirection) => void;
	headers: TableHeader[];
}

export default class SortableTable extends React.Component<SortableTableProps, void> {
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
		};

		const headers = this.props.headers.map(header => {
			let info = null;
			if (header.infoText) {
				info = (
					<InfoIcon header={header.infoHeader} content={header.infoText} />
				);
			}
			let sort = null;
			if (typeof header.sortable === "undefined" || header.sortable === true) {
				sort = <SortIndicator
					direction={header.key === this.props.sortBy ? this.props.sortDirection : null}
				/>;
			}
			return (
				<th
					className={sort !== null ? "th-sortable" : null}
					onClick={sort !== null && this.props.onSortChanged ? () => onHeaderClick(header) : null}
				>
					{header.text}
					{sort}
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
