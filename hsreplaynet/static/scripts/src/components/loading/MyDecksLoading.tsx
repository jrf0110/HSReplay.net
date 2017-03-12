import * as React from "react";
import CardData from "../../CardData";
import { cloneComponent } from "../../helpers";
import { LoadingStatus, TableData } from "../../interfaces";

interface MyDecksLoadingProps extends React.ClassAttributes<MyDecksLoading> {
	cardData?: CardData;
	data?: any;
	status?: LoadingStatus;
}

export default class MyDecksLoading extends React.Component<MyDecksLoadingProps, void> {
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
		if (Object.keys(this.props.data).length === 0) {
			return <h3 className="message-wrapper">No available data.</h3>;
		}
		return cloneComponent(this.props.children, this.props);
	}
}
