import React from "react";

interface PopularityGradientProps {
	id: string;
	colorMin: string;
	colorMax: string;
}

export default class PopularityGradient extends React.Component<
	PopularityGradientProps,
	any
> {
	render(): JSX.Element {
		return (
			<linearGradient
				id={this.props.id}
				x1="0%"
				y1="50%"
				x2="100%"
				y2="50%"
			>
				<stop stopColor={this.props.colorMin} offset={0} />
				<stop stopColor={this.props.colorMin} offset={0.2} />
				<stop stopColor={this.props.colorMax} offset={0.8} />
				<stop stopColor={this.props.colorMax} offset={1} />
			</linearGradient>
		);
	}
}
