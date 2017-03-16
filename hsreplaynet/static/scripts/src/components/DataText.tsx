import * as React from "react";

interface DataTextProps extends React.ClassAttributes<DataText> {
	data?: any;
	p?: boolean;
}

export default class DataText extends React.Component<DataTextProps, void> {
	render(): JSX.Element {
		if(typeof this.props.p !== "undefined" && !this.props.p) {
			return <span>{this.props.data}</span>;
		}
		return <p>{this.props.data}</p>;
	}
}
