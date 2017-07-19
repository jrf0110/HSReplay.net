import * as React from "react";
import * as _ from "lodash";
import { winrateData } from "../../helpers";

interface RankTileState {
	popularity?: number;
	rank?: number;
	winrate?: number;
}

interface RankTileProps extends React.ClassAttributes<RankTile> {
	archetypeId: number;
	dataProp: "winrate"|"popularity";
	popularityData?: any;
	title: string;
}

export default class RankTile extends React.Component<RankTileProps, RankTileState> {
	constructor(props: RankTileProps, state: RankTileState) {
		super(props, state);
		this.state = {
			popularity: 0,
			rank: null,
			winrate: 0,
		};
	}

	componentDidMount() {
		this.updateData(this.props);
	}

	componentWillReceiveProps(nextProps: RankTileProps) {
		if (!_.isEqual(this.props.popularityData, nextProps.popularityData)) {
			this.updateData(nextProps);
		}
	}

	updateData(props: RankTileProps) {
		if (!props.popularityData) {
			return;
		}

		const data = props.popularityData.series.data;
		const rankData = Object.keys(data).map((rank) => {
			return data[rank].find((archetype) => archetype.archetype_id === props.archetypeId);
		}).filter((x) => x !== undefined);
		if (!rankData.length) {
			return;
		}

		const sortProp = this.props.dataProp === "winrate" ? "win_rate" : "pct_of_rank";
		rankData.sort((a, b) => b[sortProp] - a[sortProp] || (a.rank - b.rank));
		this.setState({
			popularity: rankData[0].pct_of_rank,
			rank: rankData[0].rank,
			winrate: rankData[0].win_rate,
		});
	}

	render(): JSX.Element {
		const wrData = winrateData(50, this.state.winrate, 3);
		const rankMedalName = "Medal_Ranked_" + (this.state.rank || "Legend");

		let href = "/meta/";
		let data = null;

		if (this.props.dataProp === "popularity") {
			href += "#tab=popularity";
			data = <span>{this.state.popularity}% of decks</span>;
		}
		else {
			data = [
				<span className="winrate">Winrate:</span>,
				<span style={{color: wrData.color}}>{this.state.winrate}%</span>,
			];
		}

		let rankImage = null;
		let rankText = null;
		if (this.state.rank !== null) {
			rankImage = (
				<img
					className="rank-icon"
					src={`${STATIC_URL}images/ranked-medals/${rankMedalName}.png`}
				/>
			);
			rankText = <h2>{this.state.rank ? "Rank " + this.state.rank : "Legend"}</h2>;
		}

		return (
			<div className="col-xs-12 col-sm-6 col-md-4 col-lg-3">
				<a className="tile rank-tile" href={href}>
					<div className="tile-title">
						{this.props.title}
					</div>
					<div className="tile-content">
						{rankImage}
						{rankText}
						<div className="tile-data">
							{data}
						</div>
					</div>
				</a>
			</div>
		);
	}
}
