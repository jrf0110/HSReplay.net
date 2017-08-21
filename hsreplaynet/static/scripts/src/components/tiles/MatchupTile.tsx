import * as React from "react";
import {getArchetypeUrl, winrateData} from "../../helpers";

interface MatchupTileProps extends React.ClassAttributes<MatchupTile> {
	archetypeId?: number;
	archetypeName?: string;
	games?: number;
	playerClass?: string;
	title: string;
	winrate?: number;
}

export default class MatchupTile extends React.Component<MatchupTileProps, {}> {
	render(): JSX.Element {
		let content = null;
		if (this.props.playerClass && this.props.games !== undefined && this.props.winrate !== undefined) {
			const wrData = winrateData(50, this.props.winrate, 3);
			content = [
				<div>
					<span className={`player-class ${this.props.playerClass.toLowerCase()}`}>
						{this.props.archetypeName}
					</span>
				</div>,
				<div className="stats-table">
					<table>
						<tr>
							<th>Winrate:</th>
							<td style={{color: wrData.color}}>{this.props.winrate}%</td>
						</tr>
						<tr>
							<th>Games:</th>
							<td>{this.props.games}</td>
						</tr>
					</table>
				</div>,
			];
		}

		let href = null;
		if (this.props.archetypeId && this.props.archetypeName) {
			href = getArchetypeUrl(this.props.archetypeId, this.props.archetypeName);
		}

		return (
			<div className="col-xs-12 col-sm-6 col-d-4 col-lg-3">
				<a className="tile matchup-tile" href={href}>
					<div className="tile-title">
						{this.props.title}
					</div>
					<div className="tile-content">
						{content}
					</div>
				</a>
			</div>
		);
	}
}
