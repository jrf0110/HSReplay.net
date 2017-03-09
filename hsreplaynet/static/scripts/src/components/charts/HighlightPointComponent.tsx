import * as React from "react";
import {VictoryPortal} from "victory";
import {Point} from "victory-core";

interface HighlightPointComponentProps extends React.ClassAttributes<HighlightPointComponent> {
	[key: string]: any;
}

export default class HighlightPointComponent extends React.Component<HighlightPointComponentProps, any> {
	render() {
		const datum = Object.assign({}, this.props.datum);
		return <Point
			active={true}
			size={1}
			symbol="circle"
			style={{
				stroke: "black",
				fill: "black",
				pointerEvents: "none",
			}}
			x={this.props.x}
			y={this.props.y}
		/>;
	}
}
