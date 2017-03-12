import moment from "moment";
import * as React from "react";
import { MyDecks } from "../../interfaces";

interface PersonalStatsProps extends React.ClassAttributes<PersonalDeckStats> {
	data?: MyDecks;
	deckId: number;
}

export default class PersonalDeckStats extends React.Component<PersonalStatsProps, void> {
	render(): JSX.Element {
		const deck = this.props.data[this.props.deckId];
		if (!deck) {
			return null;
		}
		return (
			<section>
				<h2>Personal</h2>
				<ul>
					<li>
						Games
						<span className="infobox-value">{deck.total_games}</span>
					</li>
					<li>
						Winrate
						<span className="infobox-value">{(+deck["win_rate"] * 100).toFixed(1) + "%"}</span>
					</li>
					<li>
						Match duration
						<span className="infobox-value">
							{moment.duration(+deck["avg_game_length_seconds"], "second").asMinutes().toFixed(1) + " minutes"}
						</span>
					</li>
					<li>
						Number of turns
						<span className="infobox-value">{deck["avg_num_turns"]}</span>
					</li>
				</ul>
			</section>
		);
	}
}
