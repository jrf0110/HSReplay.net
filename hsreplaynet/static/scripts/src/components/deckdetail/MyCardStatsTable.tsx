import * as React from "react";
import { cardObjSorting, cardSorting, winrateData } from "../../helpers";
import { SortDirection, TableData } from "../../interfaces";
import CardTile from "../CardTile";
import SortableTable from "../SortableTable";

interface MyCardStatsTableProps {
	cards: any[];
	data?: TableData;
	hiddenColumns?: string[];
	numCards: number;
	onSortChanged: (sortBy: string, sortDirection: SortDirection) => void;
	sortBy: string;
	sortDirection: SortDirection;
}

export default class MyCardStatsTable extends React.Component<MyCardStatsTableProps, void> {
	render(): JSX.Element {
		const rows = [];
		const cardObjs = [];

		this.props.cards.forEach((card) => {
			const personal = this.props.data.series.data["ALL"].find((x) => x.dbf_id === card.dbfId);
			if (personal) {
				cardObjs.push({
					card,
					damageDone: personal.damage_done,
					distinctDecks: personal.num_distinct_decks,
					drawnWinrate: personal.win_rate_when_drawn,
					healingDone: personal.healing_done,
					heroesKilled: personal.heroes_killed,
					keepPercent: personal.keep_percentage,
					minionsKilled: personal.minions_killed,
					mulliganWinrate: personal.opening_hand_win_rate,
					playedWinrate: personal.win_rate_when_played,
					timesPlayed: personal.times_played,
					totalGames: personal.total_games,
					turnPlayed: personal.avg_turn_played_on,
					turnsInHand: personal.avg_turns_in_hand,
					winrate: personal.win_rate,
				});
			}
			else {
				cardObjs.push({card});
			}
		});

		const sortDirection = this.props.sortDirection as SortDirection;
		const direction = sortDirection === "descending" ? 1 : -1;
		const sortBy = this.props.sortBy;

		if (sortBy === "card") {
			cardObjs.sort((a, b) => cardSorting(a, b, -direction));
		}
		else {
			cardObjs.sort((a, b) => cardObjSorting(a, b, sortBy, direction));
		}

		const hiddenColumns = this.props.hiddenColumns || [];
		cardObjs.slice(0, this.props.numCards).forEach((obj) => {
			const cell = (key: string, alt: any) => {
				return <td className={hiddenColumns.indexOf(key) === -1 ? "" : "hidden"}>{obj[key] || alt}</td>;
			};
			const winrateCell = (key: string, alt: any) => {
				const value = obj[key];
				const hasValue = value !== undefined && value !== null;
				const wrData = hasValue && winrateData(50, value, 3);
				return (
					<td className={hiddenColumns.indexOf(key) === -1 ? "" : "hidden"} style={{color: wrData && wrData.color}}>
						{hasValue ? (+value).toFixed(1) + "%" : "-"}
					</td>
				);
			};
			rows.push(
				<tr>
					<td className="card-cell">
						<CardTile card={obj.card} count={1} height={34} />
					</td>
					{winrateCell("mulliganWinrate", 0)}
					{cell("keepPercent", 0)}
					{winrateCell("drawnWinrate", 0)}
					{winrateCell("playedWinrate", 0)}
					{cell("turnsInHand", 0)}
					{cell("turnPlayed", 0)}
					{cell("totalGames", 0)}
					{winrateCell("winrate", 0)}
					{cell("timesPlayed", 0)}
					{cell("distinctDecks", 0)}
					{cell("damageDone", 0)}
					{cell("healingDone", 0)}
					{cell("heroesKilled", 0)}
					{cell("minionsKilled", 0)}
				</tr>,
			);
		});

		return (
			<SortableTable
				sortBy={sortBy}
				sortDirection={sortDirection}
				onSortChanged={this.props.onSortChanged}
				headers={this.tableHeaders.filter((x) => hiddenColumns.indexOf(x.sortKey) === -1)}
			>
				{rows}
			</SortableTable>
		);
	}

	readonly tableHeaders = [
		{sortKey: "card", text: "Card", defaultSortDirection: "ascending" as SortDirection},
		{
			infoHeader: "Mulligan winrate",
			infoText: "Average winrate of games when the card ended up in the opening hand.",
			sortKey: "mulliganWinrate",
			text: "Mulligan WR",
		},
		{
			infoHeader: "Kept",
			infoText: "Percentage of times the card was kept when presented during mulligan.",
			sortKey: "keepPercent",
			text: "Kept",
		},
		{
			infoHeader: "Drawn winrate",
			infoText: "Average winrate of games where the card was drawn at any point or ended up in the opening hand.",
			sortKey: "drawnWinrate",
			text: "Drawn WR",
		},
		{
			infoHeader: "Played winrate",
			infoText: "Average winrate of games where the card was played at any point.",
			sortKey: "playedWinrate",
			text: "Played WR",
		},
		{
			infoHeader: "Turns held",
			infoText: "Average number of turns the card was held in hand.",
			sortKey: "turnsInHand",
			text: "Turns held",
		},
		{
			infoHeader: "Turn played",
			infoText: "Average turn the card was played on.",
			sortKey: "turnPlayed",
			text: "Turn played",
		},
		{
			infoHeader: "Total games",
			infoText: "Number of games you played with a deck that included the card.",
			sortKey: "totalGames",
			text: "Total games",
		},
		{
			infoHeader: "Winrate",
			infoText: "Winrate of decks including the card.",
			sortKey: "winrate",
			text: "Winrate",
		},
		{
			infoHeader: "Times played",
			infoText: "Number of times you played the card.",
			sortKey: "timesPlayed",
			text: "Times played",
		},
		{
			infoHeader: "Distinct decks",
			infoText: "Number of distinct decks you included the card in.",
			sortKey: "distinctDecks",
			text: "Distinct decks",
		},
		{
			infoHeader: "Damage done",
			infoText: "Total amount of damage the card has dealt. Does not include overkills.",
			sortKey: "damageDone",
			text: "Damage done",
		},
		{
			infoHeader: "Healing done",
			infoText: "Total amount of healing the card has done. Does not include overhealing.",
			sortKey: "healingDone",
			text: "Healing done",
		},
		{
			infoHeader: "Heroes killed",
			infoText: "Number of heroes the card has killed.",
			sortKey: "heroesKilled",
			text: "Heroes killed",
		},
		{
			infoHeader: "Minions killed",
			infoText: "Number of minions the card has killed.",
			sortKey: "minionsKilled",
			text: "Minions killed",
		},
	];
}
