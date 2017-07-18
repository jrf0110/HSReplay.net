import * as React from "react";
import * as _ from "lodash";
import { getPlayerClassFromId, winrateData } from "../../helpers";

interface MatchupTileState {
	games?: number;
	name?: string;
	playerClass?: string;
	winrate?: number;
}

interface MatchupTileProps extends React.ClassAttributes<MatchupTile> {
	archetypeId: number;
	archetypeData?: any;
	matchupData?: any;
	title: string;
	matchup: "best"|"worst";
}

export default class MatchupTile extends React.Component<MatchupTileProps, MatchupTileState> {
	constructor(props: MatchupTileProps, state: MatchupTileState) {
		super(props, state);
		this.state = {
			games: 0,
			name: "",
			playerClass: "",
			winrate: 0,
		};
	}

	componentDidMount() {
		this.updateData(this.props);
	}

	componentWillReceiveProps(nextProps: MatchupTileProps) {
		if (
			!_.isEqual(this.props.archetypeData, nextProps.archetypeData)
			|| !_.isEqual(this.props.matchupData, nextProps.matchupData)
		) {
			this.updateData(nextProps);
		}
	}

	updateData(props: MatchupTileProps) {
		if (!props.archetypeData || !props.matchupData) {
			return;
		}

		const matchups = props.matchupData.series.data["" + this.props.archetypeId];
		if (matchups) {
			const matchupData = Object.keys(matchups).map((id) => {
				const opponentData = props.archetypeData.results.find((archetype) => archetype.id === +id);
				if (opponentData) {
					return {
						games: matchups[id].total_games,
						name: opponentData.name,
						playerClass: getPlayerClassFromId(opponentData.player_class),
						winrate: matchups[id].win_rate,
					};
				}
			}).filter((x) => x !== undefined);
			matchupData.sort((a, b) => b.winrate - a.winrate);
			const index = this.props.matchup === "best" ? 0 : matchupData.length - 1;
			this.setState({...matchupData[index]});
		}
	}

	render(): JSX.Element {
		const wrData = winrateData(50, this.state.winrate, 3);
		return (
			<div className="col-xs-12 col-sm-6 col-md-4 col-lg-3">
				<div className="tile matchup-tile">
					<div className="tile-title">
						{this.props.title}
					</div>
					<div className="tile-content">
						<div>
							<span className={`player-class ${this.state.playerClass.toLowerCase()}`}>
								{this.state.name}
							</span>
						</div>
						<div className="stats-table">
							<table>
								<tr>
									<th>Winrate:</th>
									<td style={{color: wrData.color}}>{this.state.winrate}%</td>
								</tr>
								<tr>
									<th>Games:</th>
									<td>{this.state.games}</td>
								</tr>
							</table>
						</div>
					</div>
				</div>
			</div>
		);
	}
}
