import * as React from "react";
import {cardObjSorting, cardSorting, winrateData} from "../../helpers";
import {CardObj, SortDirection, TableData} from "../../interfaces";
import CardTable from "../cardtable/CardTable";

interface MyStatisticsCardTableProps {
	cards: CardObj[];
	data?: TableData;
	onSortChanged: (sortBy: string, sortDirection: SortDirection) => void;
	sortBy: string;
	sortDirection: SortDirection;
}

export default class MyStatisticsCardTable extends React.Component<MyStatisticsCardTableProps, void> {
	render(): JSX.Element {
		const cardData = [];

		this.props.cards.forEach((cardObj) => {
			const data = this.props.data.series.data["ALL"].find((x) => x.dbf_id === cardObj.card.dbfId);
			cardData.push({card: cardObj, data});
		});

		const {sortBy, sortDirection} = this.props;
		const direction = sortDirection === "descending" ? 1 : -1;

		if (sortBy === "card") {
			cardData.sort((a, b) => cardSorting(a.card.card, b.card.card, -direction));
		}
		else {
			const key = this.columns.find((x) => x.sortKey === sortBy).dataKey;
			cardData.sort((a, b) => {
				return (b.data[key] - a.data[key]) * direction
					|| (a.card.card.name > b.card.card.name ? -direction : direction);
			});
		}

		const rowData = [];
		cardData.forEach(({card, data}) => {
			rowData.push({
				card: {card: card.card, count: card.count},
				values: this.columns.map((x) => data[x.dataKey]),
			});
		});

		return (
			<CardTable
				sortBy={sortBy}
				sortDirection={sortDirection}
				onSortChanged={this.props.onSortChanged}
				columns={this.columns}
				rowData={rowData}
			/>
		);
	}

	readonly columns = [
		{
			dataKey: "opening_hand_win_rate",
			infoHeader: "Mulligan winrate",
			infoText: "Average winrate of games when the card ended up in the opening hand.",
			sortKey: "mulliganWinrate",
			text: "Mulligan WR",
			winrateData: true,
		},
		{
			dataKey: "keep_percentage",
			infoHeader: "Kept",
			infoText: "Percentage of times the card was kept when presented during mulligan.",
			sortKey: "keepPercent",
			text: "Kept",
		},
		{
			dataKey: "win_rate_when_drawn",
			infoHeader: "Drawn winrate",
			infoText: "Average winrate of games where the card was drawn at any point or ended up in the opening hand.",
			sortKey: "drawnWinrate",
			text: "Drawn WR",
			winrateData: true,
		},
		{
			dataKey: "win_rate_when_played",
			infoHeader: "Played winrate",
			infoText: "Average winrate of games where the card was played at any point.",
			sortKey: "playedWinrate",
			text: "Played WR",
			winrateData: true,
		},
		{
			dataKey: "avg_turns_in_hand",
			infoHeader: "Turns held",
			infoText: "Average number of turns the card was held in hand.",
			sortKey: "turnsInHand",
			text: "Turns held",
		},
		{
			dataKey: "avg_turn_played_on",
			infoHeader: "Turn played",
			infoText: "Average turn the card was played on.",
			sortKey: "turnPlayed",
			text: "Turn played",
		},
		{
			dataKey: "times_played",
			infoHeader: "Times played",
			infoText: "Number of times you played the card.",
			sortKey: "timesPlayed",
			text: "Times played",
		},
		{
			dataKey: "damage_done",
			infoHeader: "Damage done",
			infoText: "Total amount of damage the card has dealt. Does not include overkills.",
			sortKey: "damageDone",
			text: "Damage done",
		},
		{
			dataKey: "healing_done",
			infoHeader: "Healing done",
			infoText: "Total amount of healing the card has done. Does not include overhealing.",
			sortKey: "healingDone",
			text: "Healing done",
		},
		{
			dataKey: "heroes_killed",
			infoHeader: "Heroes killed",
			infoText: "Number of heroes the card has killed.",
			sortKey: "heroesKilled",
			text: "Heroes killed",
		},
		{
			dataKey: "minions_killed",
			infoHeader: "Minions killed",
			infoText: "Number of minions the card has killed.",
			sortKey: "minionsKilled",
			text: "Minions killed",
		},
	];
}
