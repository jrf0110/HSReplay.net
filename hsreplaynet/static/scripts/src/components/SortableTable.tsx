import * as React from "react";
import InfoIcon from "./InfoIcon";
import SortIndicator from "./SortIndicator";
import { TooltipContent } from "./Tooltip";

export type SortDirection = "ascending" | "descending";

export interface TableHeader {
	key: string;
	text: string;
	defaultSortDirection?: SortDirection;
	infoHeader?: string;
	infoText?: TooltipContent;
	sortable?: boolean;
	classNames?: string[];
}

interface SortableTableProps {
	sortBy: string;
	sortDirection: SortDirection;
	onSortChanged?: (sortBy: string, sortDirection: SortDirection) => void;
	headers: TableHeader[];
}

export default class SortableTable extends React.Component<SortableTableProps, void> {
	render(): JSX.Element {
		const onHeaderClick = (header: TableHeader) => {
			if (typeof this.props.onSortChanged !== "function") {
				return;
			}
			let sortDirection: SortDirection;
			if (this.props.sortBy === header.key) {
				sortDirection = this.props.sortDirection === "ascending" ? "descending" : "ascending";
			}
			else {
				sortDirection = header.defaultSortDirection || "descending";
			}
			this.props.onSortChanged(header.key, sortDirection);
		};

		const headers = this.props.headers.map((header) => {
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
			const className = header.classNames ? " " + header.classNames.join(" ") : "";
			return (
				<th
					className={(sort !== null ? "th-sortable" : null) + className}
					onClick={sort !== null ? (event) => {
						if (event && event.currentTarget) {
							event.currentTarget.blur();
						}
						onHeaderClick(header);
					} : null}
					onKeyPress={(event) => {
						if (event.which !== 13) {
							return;
						}

						onHeaderClick(header);
					}}
					tabIndex={sort !== null ? 0 : -1}
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
