import * as React from "react";
import {getAge} from "../PrettyTime";

interface SemanticAgeProps extends React.ClassAttributes<SemanticAge> {
	date?: Date;
	noSuffix?: boolean;
}

export default class SemanticAge extends React.Component<SemanticAgeProps, void> {
	render(): JSX.Element {
		if (!this.props.date) {
			return null;
		}

		const machineReadable = this.props.date.toISOString();
		const phrasing = getAge(this.props.date, this.props.noSuffix);

		return <time dateTime={machineReadable}>{phrasing}</time>;
	}
}
