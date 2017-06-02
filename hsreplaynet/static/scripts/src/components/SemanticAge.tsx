import * as React from "react";
import {getAge} from "../PrettyTime";

interface SemanticAgeProps extends React.ClassAttributes<SemanticAge> {
	date?: Date;
}

export default class SemanticAge extends React.Component<SemanticAgeProps, void> {
	render(): JSX.Element {
		if (!this.props.date) {
			return null;
		}

		const machineReadable = this.props.date.toISOString();
		const phrasing = getAge(this.props.date);

		return <time dateTime={machineReadable}>{phrasing}</time>;
	}
}
