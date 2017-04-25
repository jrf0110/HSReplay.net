import * as React from "react"

interface TabProps {
	id: string;
	hidden?: boolean;
	disabled?: boolean;
	label?: string | JSX.Element;
}

export default class Tab extends React.Component<TabProps, void> {
	render() {
		return <div>{this.props.children}</div>;
	}
}
