import moment from "moment";
import * as React from "react";
import { toPrettyNumber } from "../../helpers";
import { TableData } from "../../interfaces";
import InfoboxLastUpdated from "../InfoboxLastUpdated";
import DataManager from "../../DataManager";

interface DeckStatsState {
	expandWinrate?: boolean;
}

interface DeckStatsProps {
	data?: TableData;
	dataManager: DataManager;
	deckId?: string;
	lastUpdatedParams: string;
	lastUpdatedUrl: string;
	playerClass: string;
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

		const deck = this.props.data.series.data[this.props.playerClass].find((x) => x.deck_id === this.props.deckId);
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
					<InfoboxLastUpdated
						dataManager={this.props.dataManager}
						url={this.props.lastUpdatedUrl}
						params={this.props.lastUpdatedParams}
					/>
					<li>
						Time frame
						<span className="infobox-value">Last 30 days</span>
					</li>
					<li>
						Winrate
						<span className="infobox-value">{(+deck["win_rate"]).toFixed(1) + "%"}</span>
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
