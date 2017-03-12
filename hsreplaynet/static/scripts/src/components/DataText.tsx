import * as React from "react";

interface DataTextProps extends React.ClassAttributes<DataText> {
	data?: any;
}

export default class DataText extends React.Component<DataTextProps, void> {
	render(): JSX.Element {
		return <p>{this.props.data}</p>;
	}
}
