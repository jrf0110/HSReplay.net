import * as React from "react";
import SortHeader from "./SortHeader";
import { SortDirection, TableHeaderProps } from "../interfaces";

interface SortableTableProps {
	sortBy: string;
	sortDirection: SortDirection;
	onSortChanged?: (sortBy: string, sortDirection: SortDirection) => void;
	headers: TableHeaderProps[];
}

export default class SortableTable extends React.Component<SortableTableProps, void> {
	render(): JSX.Element {
		const headers = this.props.headers.map((header) => {
			return (
				<SortHeader
					active={this.props.sortBy === header.sortKey}
					direction={this.props.sortDirection}
					onClick={(key, direction) => this.props.onSortChanged(key, direction)}
					{...header}
				/>
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
