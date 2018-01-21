import React from "react";
import { toDynamicFixed } from "../../../helpers";

interface PopularityCellProps extends React.ClassAttributes<PopularityCell> {
	popularity: number;
	maxPopularity: number;
	style?: any;
}

export default class PopularityCell extends React.Component<PopularityCellProps, {}> {
	render() {
		const classNames = ["matchup-cell"];
		const lightness = 45 + Math.floor(55 * Math.max(0, (1 - (this.props.popularity || 0 ) / (this.props.maxPopularity))));
		const color = lightness > 60 ? "black" : "white";
		const backgroundColor = `hsl(214,50%,${lightness}%)`;

		return (
			<div
				className={classNames.join(" ")}
				style={{color, backgroundColor, ...this.props.style}}
			>
				{this.props.popularity ? toDynamicFixed(this.props.popularity, 2) : 0}%
			</div>
		);
	}
}
