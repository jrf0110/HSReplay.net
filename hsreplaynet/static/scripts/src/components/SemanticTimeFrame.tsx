import * as React from "react";
import * as moment from "moment";

interface SemanticTimeFrameProps extends React.ClassAttributes<SemanticTimeFrame> {
	date?: Date;
	unit?: string;
}

export default class SemanticTimeFrame extends React.Component<SemanticTimeFrameProps, void> {
	render(): JSX.Element {
		if (!this.props.date) {
			return null;
		}

		const unit = typeof this.props.unit === "string" ? this.props.unit : "days";

		const machineReadable = this.props.date.toISOString();
		const phrasing = "Last " + moment.utc().diff(moment(this.props.date).utc(), unit as any) + " days";

		return <time dateTime={machineReadable}>{phrasing}</time>;
	}
}
