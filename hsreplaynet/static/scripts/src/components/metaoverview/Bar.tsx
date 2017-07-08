import * as React from "react";

export const enum BarDirection {
	VERTICAL,
	HORIZONTAL,
}

interface BarProps extends React.ClassAttributes<Bar> {
	total: number;
	value: number;
	direction?: BarDirection;
}

export default class Bar extends React.Component<BarProps, {}> {
	render() {
		const direction = this.props.direction || BarDirection.VERTICAL;

		return (
			<span style={{
				display: "block",
				verticalAlign: "bottom",
				backgroundColor: "red",
				height: `${100 / this.props.total * this.props.value}%`,
			}}></span>
		);
	}
}
