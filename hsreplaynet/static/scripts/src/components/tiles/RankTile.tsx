import * as React from "react";
import {winrateData} from "../../helpers";

interface RankTileProps extends React.ClassAttributes<RankTile> {
	href: string;
	popularity?: number;
	rank?: number;
	title: string;
	winrate?: number;
	type: "performance" | "popularity";
}

export default class RankTile extends React.Component<RankTileProps, {}> {

	render(): JSX.Element {
		let content = null;
		if (this.props.rank !== undefined && (this.props.popularity !== undefined || this.props.winrate !== undefined)) {
			const wrData = winrateData(50, this.props.winrate, 3);
			const rankMedalName = "Medal_Ranked_" + (this.props.rank || "Legend");

			let data = null;
			if (this.props.type === "popularity") {
				data = <span>{this.props.popularity}% of decks</span>;
			}
			else {
				data = [
					<span className="winrate">Winrate:</span>,
					<span style={{color: wrData.color}}>{this.props.winrate}%</span>,
				];
			}

			content = [
				<img
					className="rank-icon"
					src={`${STATIC_URL}images/ranked-medals/${rankMedalName}.png`}
				/>,
				<h2>{this.props.rank ? "Rank " + this.props.rank : "Legend"}</h2>,
				<div className="tile-data">
					{data}
				</div>,
			];
		}

		return (
			<div className="col-xs-12 col-sm-6 col-md-4 col-lg-3">
				<a className="tile rank-tile" href={this.props.href}>
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
