import * as React from "react";
import CardData from "../../CardData";
import { cloneComponent } from "../../helpers";
import { LoadingStatus, RenderData } from "../../interfaces";

interface ChartLoadingProps extends React.ClassAttributes<ChartLoading> {
	cardData?: CardData;
	data?: RenderData;
	status?: LoadingStatus;
	minDataPoints?: number;
	widthRatio?: number;
}

export default class ChartLoading extends React.Component<ChartLoadingProps, void> {
	render(): JSX.Element {
		const width = 150 * (this.props.widthRatio || 2);
		const loadingMessage = this.getLoadingMessage();
		if (loadingMessage) {
			return (
				<div className="chart-wrapper">
					<svg viewBox={"0 0 " + width + " 150"}/>
					{loadingMessage}
				</div>
			);
		}
		return cloneComponent(this.props.children, this.props);
	}

	getLoadingMessage(): JSX.Element {
		switch (this.props.status) {
			case "loading":
				return <h3 className="chart-message-wrapper">Loading...</h3>;
			case "processing":
				return (
					<div className="chart-message-wrapper">
						<h3>Loading...</h3>
						<p><i>This may take a few seconds</i></p>
					</div>
				);
			case "error":
				return <h3 className="chart-message-wrapper">Please check back later</h3>;
		}
		if (this.props.cardData === null) {
			return <h3 className="chart-message-wrapper">Loading...</h3>;
		}
		if (this.props.data.series.length === 0 || this.props.data.series[0].data.length < (this.props.minDataPoints || 2)) {
			return <h3 className="chart-message-wrapper">No available data.</h3>;
		}
		return null;
	}
}
