import * as React from "react";
import {Point} from "victory-core";

interface HighlightPointComponentProps {
	[key: string]: any;
}

export default class HighlightPointComponent extends React.Component<HighlightPointComponentProps, any> {
	render() {
		const datum = Object.assign({}, this.props.datum);
		const factor = this.props.sizeFactor || 1;
		return <Point
			active={this.props.active}
			size={(this.props.active ? 1 : 0) * factor}
			symbol="circle"
			style={{
				stroke: "black",
				fill: "black",
				pointerEvents: "none",
			}}
			x={this.props.x}
			y={this.props.y + 10}
		/>;
	}
}
