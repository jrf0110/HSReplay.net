import * as React from "react";
import {VictoryAxis} from "victory";

export default class SectionAxis extends React.Component<any, any> {
	render(): JSX.Element {
		const xDomain = [
			this.props.domain.x[0] - 0.5,
			this.props.domain.x[1] + 0.5,
		];
		const yDomain = this.props.domain.y;
		const props = Object.assign({}, this.props, {
			domain: {
				x: xDomain,
				y: yDomain,
			}
		});
		console.log(this.props);
		return React.createElement(VictoryAxis, props);
	}
}
