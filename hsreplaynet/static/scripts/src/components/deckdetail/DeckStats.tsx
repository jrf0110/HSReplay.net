import moment from "moment";
import * as React from "react";
import { toPrettyNumber } from "../../helpers";
import { TableData } from "../../interfaces";

interface DeckStatsState {
	expandWinrate?: boolean;
}

interface DeckStatsProps extends React.ClassAttributes<DeckStats> {
	data?: TableData;
	playerClass: string;
	deckId?: number;
}

export default class DeckStats extends React.Component<DeckStatsProps, DeckStatsState> {
	constructor(props: DeckStatsProps, state: DeckStatsState) {
		super(props, state);
		this.state = {
			expandWinrate: false,
		};
	}

	render(): JSX.Element {
		const winrateClassNames = [];
		let subWinrates = null;

		if (this.props.children) {
			winrateClassNames.push("selectable", "expandable");
			if (this.state.expandWinrate) {
				winrateClassNames.push("expanded");
				subWinrates = (
					<ul>{this.props.children}</ul>
				);
			}
		}
		const deck = this.props.data.series.data[this.props.playerClass].find((x) => +x["deck_id"] === this.props.deckId);
		if (!deck) {
			return null;
		}
		return (
			<section>
				<h2>Data</h2>
				<ul>
					<li>
						Based on
						<span className="infobox-value">{toPrettyNumber(+deck["total_games"]) + " replays"}</span>
					</li>
					<li>
						Time frame
						<span className="infobox-value">Last 30 days</span>
					</li>
					<li
						className={winrateClassNames.join(" ")}
						onClick={() => this.setState({expandWinrate: !this.state.expandWinrate})}
					>
						Winrate
						<span className="infobox-value">{(+deck["win_rate"]).toFixed(1) + "%"}</span>
						{subWinrates}
					</li>
					<li>
						Avg. match duration
						<span className="infobox-value">
							{moment.duration(+deck["avg_game_length_seconds"], "second").asMinutes().toFixed(1) + " minutes"}
						</span>
					</li>
					<li>
						Avg. number of turns
						<span className="infobox-value">{deck["avg_num_player_turns"]}</span>
					</li>
				</ul>
			</section>
		);
	}
}
