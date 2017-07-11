import * as React from "react";

export const enum BarDirection {
	VERTICAL,
	HORIZONTAL,
}

interface BarProps extends React.ClassAttributes<Bar> {
	total: number;
	value: number;
	label?: string;
	direction?: BarDirection;
}

export default class Bar extends React.Component<BarProps, {}> {
	render() {
		const direction = this.props.direction || BarDirection.VERTICAL;
		const style = {};

		const size = `${100 / this.props.total * this.props.value}%`;
		style[direction === BarDirection.HORIZONTAL ? "width" : "height"] = size;

		return (
			<div className={`bar bar-${direction === BarDirection.HORIZONTAL ? "horizontal" : "vertical"}`}>
				<div className="bar-body">
					<div style={style}></div>
				</div>
				<div className="bar-label">{this.props.label}</div>
			</div>
		);
	}
}
