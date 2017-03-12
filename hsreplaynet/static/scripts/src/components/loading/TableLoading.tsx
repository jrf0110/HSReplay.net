import * as React from "react";
import CardData from "../../CardData";
import { cloneComponent } from "../../helpers";
import { LoadingStatus, TableData } from "../../interfaces";

interface TableLoadingProps extends React.ClassAttributes<TableLoading> {
	cardData?: CardData;
	data1?: TableData;
	data?: TableData;
	status?: LoadingStatus;
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
		const data = this.props.data.series.data;
		if (Object.keys(data).every((key) => data[key].length === 0)) {
			return <h3 className="message-wrapper">No available data.</h3>;
		}
		if (this.props.data1) {
			const data1 = this.props.data1.series.data;
			if (Object.keys(data1).every((key) => data1[key].length === 0)) {
				return <h3 className="message-wrapper">No available data.</h3>;
			}
		}
		return cloneComponent(this.props.children, this.props);
	}
}
