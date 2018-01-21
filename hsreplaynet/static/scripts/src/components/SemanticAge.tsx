import React from "react";
import * as moment from "moment";

interface SemanticAgeProps extends React.ClassAttributes<SemanticAge> {
	date?: Date;
	noSuffix?: boolean;
}

export default class SemanticAge extends React.Component<SemanticAgeProps, {}> {
	private interval: number;

	componentDidMount() {
		this.interval = window.setInterval(() => {
			// rerender to refresh the timestamp
			this.forceUpdate();
		}, 5000);
	}

	componentWillUnmount() {
		clearInterval(this.interval);
	}

	render(): JSX.Element {
		const { date, noSuffix } = this.props;

		if (!date || !(date instanceof Date)) {
			return null;
		}

		// for now, set this globally on every render
		moment.relativeTimeThreshold("m", 60);

		const machineReadable = date.toISOString();
		const phrasing = moment(date)
			.utc()
			.fromNow(!!noSuffix);

		return <time dateTime={machineReadable}>{phrasing}</time>;
	}
}
