import * as React from "react";
import * as _ from "lodash";
import { MatchupData } from "../../../interfaces";
import { getColorString, toDynamicFixed } from "../../../helpers";
import {Colors} from "../../../Colors";
import Tooltip from "../../Tooltip";

interface MatchupCellProps extends React.ClassAttributes<MatchupCell> {
	highlightColumn?: boolean;
	highlightRow?: boolean;
	matchupData: MatchupData;
	isIgnored: boolean;
	style?: any;
	onHover?: (hovering: boolean) => void;
}

export default class MatchupCell extends React.Component<MatchupCellProps, {}> {
	shouldComponentUpdate(nextProps: MatchupCellProps): boolean {
		return (
			this.props.highlightColumn !== nextProps.highlightColumn
			|| this.props.highlightRow !== nextProps.highlightRow
			|| this.props.isIgnored !== nextProps.isIgnored
			|| !_.isEqual(this.props.style, nextProps.style)
			|| !_.isEqual(this.props.matchupData, nextProps.matchupData)
		);
	}

	render() {
		let label: string|JSX.Element = "";
		const color = "black";
		let backgroundColor = "white";
		const winrate = this.props.matchupData.winrate || 0;
		const classNames = ["matchup-cell"];

		if (this.props.matchupData.friendlyId === this.props.matchupData.opponentId) {
			// mirror match
			label = (
				<Tooltip content="Mirror&nbsp;matchup" simple>
					<svg viewBox={"0 0 10 10"} style={{height: "1em", verticalAlign: "middle"}}>
						<path
							id="foo"
							d="M1 9 L 9 1"
							style={{
								stroke: "black",
								strokeWidth: "0.6pt",
								strokeOpacity: 1,
								strokeLinejoin: "round",
							}} />
					</svg>
				</Tooltip>
			);
			backgroundColor = "rgb(200,200,200)";
		}
		else if (this.props.matchupData.totalGames >= 30) {
			// actual matchup
			backgroundColor = getColorString(Colors.REDORANGEGREEN, 70, winrate / 100, false);
			label = (
				<Tooltip
					simple
					id="tooltip-matchup-cell"
					content={(
						<table>
							<tr>
								<th>Winrate:</th>
								<td>{toDynamicFixed(winrate, 2)}%</td>
							</tr>
							<tr>
								<th>Games:</th>
								<td>{this.props.matchupData.totalGames || 0}</td>
							</tr>
						</table>
					)}
				>
					{`${winrate.toFixed(2)}%`}
				</Tooltip>
			);
		}
		else {
			// not enough data
			label = <Tooltip content="Not enough games" simple>⁓</Tooltip>;
			backgroundColor = "rgb(200,200,200)";
		}

		if (this.props.isIgnored) {
			classNames.push("ignored");
		}

		if (this.props.highlightRow) {
			classNames.push("highlight-row");
		}

		if (this.props.highlightColumn) {
			classNames.push("highlight-column");
		}

		return (
			<div
				className={classNames.join(" ")}
				style={{color, backgroundColor, ...this.props.style}}
				onMouseEnter={() => this.props.onHover(true)}
				onMouseLeave={() => this.props.onHover(false)}
			>
				{label}
			</div>
		);
	}
}
