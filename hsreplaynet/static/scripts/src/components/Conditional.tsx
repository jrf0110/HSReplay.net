import * as React from "react";

interface ConditionalProps extends React.ClassAttributes<Conditional> {
	condition: boolean;
}

export default class Conditional extends React.Component<ConditionalProps, void> {
	render(): JSX.Element {
		if (this.props.condition) {
			return React.Children.only(this.props.children);
		}
		return null;
	}
}
