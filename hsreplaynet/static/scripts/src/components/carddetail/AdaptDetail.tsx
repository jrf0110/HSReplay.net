import * as React from "react";
import { TableData } from "../../interfaces";
import ClassFilter, { FilterOption } from "../ClassFilter";
import UserData from "../../UserData";
import PremiumWrapper from "../PremiumWrapper";
import CardData from "../../CardData";
import CardTile from "../CardTile";
import { winrateData } from "../../helpers";

interface AdaptDetailProps extends React.ClassAttributes<AdaptDetail> {
	cardData: CardData;
	data?: TableData;
	opponentClass: string;
	setOpponentClass: (opponentClass: string) => void;
	userData: UserData;
}

export default class AdaptDetail extends React.Component<AdaptDetailProps, void> {
	render(): JSX.Element {
		let adaptations = 0;
		const rows = [];
		if (this.props.data && this.props.cardData) {
			const choices = this.props.data.series.data[this.props.opponentClass];
			if (choices) {
				choices.sort((a, b) => +b.popularity - +a.popularity);
				const visibleChoices = choices.slice(0, 15);
				adaptations = Math.max.apply(Math, visibleChoices.map((choice) => choice.adaptations.length));
				visibleChoices.forEach((choice, index) => {
					const cards = [];
					choice.adaptations.forEach((dbfId) => {
						const card = this.props.cardData.fromDbf(dbfId);
						cards.push(
							<td>
								<div className="card-wrapper">
									<CardTile card={card} count={1} height={34} noLink customText={this.shortAdaptText(card)} />
								</div>
							</td>,
						);
					});
					for (let i = cards.length; i < adaptations; i++) {
						cards.push(<td/>);
					}
					const wrData = winrateData(50, choice.win_rate, 2);
					const winrateCell = (
						<td style={{color: wrData.color}}>{choice.win_rate + "%"}</td>
					);
					rows.push(
						<tr className="card-table-row">
							<td>{"#" + (index + 1)}</td>
							{cards}
							<td>{winrateCell}</td>
							<td>{choice.popularity + "%"}</td>
						</tr>,
					);
				});
			}
		}
		return (
			<div className="container-fluid">
				<div className="row">
					<div className="opponent-filter-wrapper">
						<PremiumWrapper name="Single Card Adapt Opponent Selection" isPremium={this.props.userData.isPremium()}>
							<h3>Opponent class</h3>
							<ClassFilter
								filters="All"
								hideAll
								minimal
								selectedClasses={[this.props.opponentClass as FilterOption]}
								selectionChanged={(selected) => this.props.userData.isPremium() && this.props.setOpponentClass(selected[0])}
							/>
						</PremiumWrapper>
					</div>
				</div>
				<div className="row">
					<div className="table-wrapper col-lg-12">
						<table className="table table-striped">
							<thead>
							<tr>
								<th>Rank</th>
								<th>Adaptations</th>
								{Array.from({length: adaptations - 1}, (x) => <th/>)}
								<th>Winrate</th>
								<th>Popularity</th>
							</tr>
							</thead>
							<tbody>
								{rows}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		);
	}

	shortAdaptText(card: any): string {
		switch (card.dbfId) {
			case 41060:
				return "Can't be targeted";
			case 41054:
				return "Stealth";
			case 41057:
				return "Deathrattle";
			default:
				return card.text.replace("<b>", "").replace("</b>", "");
		}
	}
}
