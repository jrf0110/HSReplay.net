import * as React from "react";
import PropMultiplexer from "./PropMultiplexer";
import HighlightPointComponent from "./HighlightPointComponent";
import {VictoryTooltip} from "victory";

interface ChartHighlighterProps {
	xCenter: number;
	sizeFactor?: number;
}

export default class ChartHighlighter extends React.Component<ChartHighlighterProps, any> {
	render() {
		const factor = this.props.sizeFactor || 1;
		return React.cloneElement(<PropMultiplexer />, this.props, [
			<HighlightPointComponent sizeFactor={factor}/>,
			<VictoryTooltip
				cornerRadius={0}
				pointerLength={0}
				padding={0}
				dx={(d) => (d.x > this.props.xCenter ? -38 : 38) * factor}
				dy={-7.5 * factor}
				style={{
					fill: "white",
					fontSize: 6 * factor,
					padding: 5 * factor,
				}}
				flyoutStyle={{
					stroke: "white",
					strokeWidth: 0,
					fill: "rgba(0, 0, 0, 0.8)",
				}}
				activateData={true}
			/>,
		]);
	}
}
