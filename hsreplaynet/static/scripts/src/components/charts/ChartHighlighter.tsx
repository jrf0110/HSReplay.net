import * as React from "react";
import PropMultiplexer from "./PropMultiplexer";
import HighlightPointComponent from "./HighlightPointComponent";
import {VictoryTooltip} from "victory";

interface ChartHighlighterProps {
	xCenter: number;
}

export default class ChartHighlighter extends React.Component<ChartHighlighterProps, any> {
	render() {
		return React.cloneElement(<PropMultiplexer />, this.props, [
			<HighlightPointComponent />,
			<VictoryTooltip
				cornerRadius={0}
				pointerLength={0}
				padding={0}
				dx={d => d.x > this.props.xCenter ? -38 : 38}
				dy={-7.5}
				style={{
					fontSize: 6,
					padding: 5,
					fill: "white",
				}}
				flyoutStyle={{
					stroke: "white",
					strokeWidth: 0,
					fill: "rgba(0, 0, 0, 0.8)"
				}}
				activateData={true}
			/>,
		]);
	}
}
