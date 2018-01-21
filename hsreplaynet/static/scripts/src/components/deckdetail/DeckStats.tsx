import React from "react";
import { toPrettyNumber } from "../../helpers";
import { TableData } from "../../interfaces";
import InfoboxLastUpdated from "../InfoboxLastUpdated";

interface DeckStatsState {
	expandWinrate?: boolean;
}

interface DeckStatsProps {
	data?: TableData;
	deckId?: string;
	lastUpdatedParams: any;
	lastUpdatedUrl: string;
	playerClass: string;
}

export default class DeckStats extends React.Component<
	DeckStatsProps,
	DeckStatsState
> {
	constructor(props: DeckStatsProps, state: DeckStatsState) {
		super(props, state);
		this.state = {
			expandWinrate: false
		};
	}

	render(): JSX.Element {
		const deck = this.props.data.series.data[this.props.playerClass].find(
			x => x.deck_id === this.props.deckId
		);
		if (!deck) {
			return null;
		}
		return (
			<section>
				<h2>Data</h2>
				<ul>
					<li>
						Sample size
						<span className="infobox-value">
							{toPrettyNumber(+deck["total_games"]) + " games"}
						</span>
					</li>
					<li>
						Time frame
						<span className="infobox-value">Last 30 days</span>
					</li>
					<InfoboxLastUpdated
						url={this.props.lastUpdatedUrl}
						params={this.props.lastUpdatedParams}
					/>
				</ul>
			</section>
		);
	}
}
