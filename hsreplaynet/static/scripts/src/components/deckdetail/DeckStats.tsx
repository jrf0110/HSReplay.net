import * as React from "react";
import { toPrettyNumber } from "../../helpers";
import { TableData } from "../../interfaces";
import InfoboxLastUpdated from "../InfoboxLastUpdated";
import DataManager from "../../DataManager";
import InfoboxTimeFrame from "../InfoboxTimeFrame";

interface DeckStatsState {
	expandWinrate?: boolean;
}

interface DeckStatsProps {
	data?: TableData;
	dataManager: DataManager;
	deckId?: string;
	lastUpdatedUrl: string;
	lastUpdatedParams: any;
	timeFrameUrl: string;
	timeFrameParams: any;
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
						Sample size
						<span className="infobox-value">{toPrettyNumber(+deck["total_games"]) + " games"}</span>
					</li>
					<InfoboxTimeFrame
						dataManager={this.props.dataManager}
						url={this.props.timeFrameUrl}
						params={this.props.timeFrameParams}
					/>
					<InfoboxLastUpdated
						dataManager={this.props.dataManager}
						url={this.props.lastUpdatedUrl}
						params={this.props.lastUpdatedParams}
					/>
				</ul>
			</section>
		);
	}
}
