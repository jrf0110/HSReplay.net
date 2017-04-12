import * as React from "react";
import CardTile from "../CardTile";
import {TableRow} from "../../interfaces";
import { winrateData } from "../../helpers";
import Tooltip from "../Tooltip";

interface CardObj {
	card: any;
	count: number;
}

interface DeckBreakdownTableRowProps {
	cardObj: CardObj;
	row: TableRow;
	wildDeck: boolean;
	baseMulliganWinrate: number;
	baseDrawnWinrate: number;
	basePlayedWinrate: number;
}

export default class DeckBreakdownTableRow extends React.Component<DeckBreakdownTableRowProps, void> {
	render(): JSX.Element {
		if (!this.props.cardObj) {
			return null;
		}
		const cols = [];
		cols.push(<td>
			<div className="card-wrapper">
				<CardTile
					height={34}
					card={this.props.cardObj.card}
					count={this.props.cardObj.count}
					rarityColored
					urlGameType={this.props.wildDeck && "RANKED_WILD"}
				/>
			</div>
		</td>);
		const mulligan = winrateData(this.props.baseMulliganWinrate, +this.props.row["opening_hand_win_rate"], 5);
		const drawn = winrateData(this.props.baseDrawnWinrate, +this.props.row["win_rate_when_drawn"], 5);
		const played = winrateData(this.props.basePlayedWinrate, +this.props.row["win_rate_when_played"], 5);
		let statusIcon = null;
		if (+this.props.row["times_in_opening_hand"] < 30) {
			statusIcon = (
				<Tooltip header="Low amount of data" content="This value may not be entirely accurate.">
					<span className="glyphicon glyphicon-warning-sign" />
				</Tooltip>
			);
		}
		cols.push(
			<td className="winrate-cell" style={{color: mulligan.color}}>
				{mulligan.tendencyStr + (+this.props.row["opening_hand_win_rate"]).toFixed(1) + "%"}
				{statusIcon}
			</td>,
			<td>{(+this.props.row["keep_percentage"]).toFixed(1) + "%"}</td>,
			<td className="winrate-cell" style={{color: drawn.color}}>
				{drawn.tendencyStr + (+this.props.row["win_rate_when_drawn"]).toFixed(1) + "%"}
			</td>,
			<td className="winrate-cell" style={{color: played.color}}>
				{played.tendencyStr + (+this.props.row["win_rate_when_played"]).toFixed(1) + "%"}
			</td>,
			<td>{(+this.props.row["avg_turns_in_hand"]).toFixed(1)}</td>,
			<td>{(+this.props.row["avg_turn_played_on"]).toFixed(1)}</td>,
		);
		return <tr className="card-table-row">
			{cols}
		</tr>;
	}
}
