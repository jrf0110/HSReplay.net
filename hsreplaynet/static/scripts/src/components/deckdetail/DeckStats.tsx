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
				</ul>
			</section>
		);
	}
}
