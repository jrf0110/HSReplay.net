import React from "react";

interface TabProps extends React.ClassAttributes<Tab> {
	id: string;
	hidden?: boolean;
	disabled?: boolean;
	label?: string | JSX.Element;
	highlight?: boolean;
}

export default class Tab extends React.Component<TabProps> {
	render() {
		return <div>{this.props.children}</div>;
	}
}
