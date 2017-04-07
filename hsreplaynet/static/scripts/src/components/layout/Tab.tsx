import * as React from "react"

interface TabProps extends React.ClassAttributes<Tab> {
	id: string;
	condition?: boolean;
	label?: string | JSX.Element;
}

export default class Tab extends React.Component<TabProps, void> {
	render() {
		return <div>{this.props.children}</div>;
	}
}
