import React from "react";

interface ConditionalProps {
	condition: boolean;
}

export default class Conditional extends React.Component<ConditionalProps, {}> {
	render(): JSX.Element {
		if (this.props.condition) {
			return React.Children.only(this.props.children);
		}
		return null;
	}
}
