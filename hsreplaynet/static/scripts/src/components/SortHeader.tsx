import * as React from "react";
import InfoIcon from "./InfoIcon";
import SortIndicator from "./SortIndicator";
import { SortDirection, TableHeaderProps } from "../interfaces";

interface SortHeaderProps extends TableHeaderProps, React.ClassAttributes<SortHeader> {
	active?: boolean;
	direction?: SortDirection;
	onClick?: (key: string, direction: SortDirection) => void;
}

export default class SortHeader extends React.Component<SortHeaderProps, void> {
	render(): JSX.Element {
		let info = null;
		if (this.props.infoText) {
			info = (
				<InfoIcon header={this.props.infoHeader} content={this.props.infoText} />
			);
		}
		let sort = null;
		if (typeof this.props.sortable === "undefined" || this.props.sortable === true) {
			sort = (
				<SortIndicator direction={this.props.active ? this.props.direction : null} />
			);
		}
		const classNames = this.props.classNames ? this.props.classNames : [];
		if (sort !== null) {
			classNames.push("th-sortable");
		}
		return (
			<th
				className={classNames.join(" ")}
				onClick={sort !== null ? (event) => {
					if (event && event.currentTarget) {
						event.currentTarget.blur();
					}
					this.props.onClick(this.props.sortKey, this.getNextDirection());
				} : null}
				onKeyPress={(event) => {
					if (event.which === 13) {
						this.props.onClick(this.props.sortKey, this.getNextDirection());
					}
				}}
				tabIndex={sort !== null ? 0 : null}
			>
				{this.props.text}
				{sort}
				{info}
			</th>
		);
	}

	getNextDirection(): SortDirection {
		if (!this.props.active) {
			return this.props.defaultSortDirection;
		}
		return this.props.direction === "ascending" ? "descending" : "ascending";
	}
}