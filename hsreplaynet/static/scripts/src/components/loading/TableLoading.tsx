import * as React from "react";
import CardData from "../../CardData";
import { cloneComponent } from "../../helpers";
import { LoadingStatus, TableData } from "../../interfaces";

interface TableLoadingProps extends React.ClassAttributes<TableLoading> {
	cardData?: CardData;
	status?: LoadingStatus;
	dataKeys?: string[];
}

export default class TableLoading extends React.Component<TableLoadingProps, void> {
	render(): JSX.Element {
		switch (this.props.status) {
			case "loading":
				return <h3 className="message-wrapper">Loading...</h3>;
			case "processing":
				return (
					<div className="message-wrapper">
						<h3>Loading...</h3>
						<p><i>This may take a few seconds</i></p>
					</div>
				);
			case "error":
				return <h3 className="message-wrapper">Please check back later</h3>;
		}
		if (this.props.cardData === null) {
			return <h3 className="message-wrapper">Loading...</h3>;
		}

		const noData = (this.props.dataKeys || ["data"]).some((key) => this.props[key].length === 0);
		if (noData) {
			return <h3 className="message-wrapper">No available data.</h3>;
		}
		return cloneComponent(this.props.children, this.props);
	}
}
