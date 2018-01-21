import React from "react";

export default class DumpPropsComponent extends React.Component<any, any> {
	constructor(props: any, context: any) {
		super(props, context);
		console.debug(props);
	}

	componentWillReceiveProps(nextProps: any, nextContext: any): void {
		console.debug(nextProps);
	}

	render(): JSX.Element | any {
		return null;
	}
}
