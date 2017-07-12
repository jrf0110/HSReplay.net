import * as React from "react";
import {commaSeparate} from "../../../helpers";

interface ColumnFooterProps extends React.ClassAttributes<ColumnFooter> {
	games: number;
	maxGames?: number;
	style?: any;
}

export default class ColumnFooter extends React.Component<ColumnFooterProps, {}> {
	render() {
		const lightness = 45 + Math.floor(55 * Math.max(0, (1 - (this.props.games || 0 ) / (this.props.maxGames))));
		const backgroundColor = `hsl(214,50%,${lightness}%)`;

		return (
			<div
				className="matchup-column-footer matchup-column-footer-games"
				style={{backgroundColor, ...this.props.style}}
			>
				{commaSeparate(this.props.games)}
			</div>
		);
	}
}
