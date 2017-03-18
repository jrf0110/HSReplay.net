import * as React from "react";
import { cardObjSorting, cardSorting, winrateData } from "../../helpers";
import { TableData } from "../../interfaces";
import CardTile from "../CardTile";
import { default as SortableTable, SortDirection } from "../SortableTable";

interface MyCardStatsTableProps extends React.ClassAttributes<MyCardStatsTable> {
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
			cardObjs.push({
				card,
				damageDone: personal && personal.damage_done,
				distinctDecks: personal && personal.num_distinct_decks,
				healingDone: personal && personal.healing_done,
				heroesKilled: personal && personal.heroes_killed,
				minionsKilled: personal && personal.minions_killed,
				timesPlayed: personal && personal.times_played,
				totalGames: personal && personal.total_games,
				winrate: personal && personal.win_rate,
			});
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
			const wrData = obj.winrate && winrateData(50, obj.winrate, 3);
			const cell = (key: string, alt: any) => {
				return <td className={hiddenColumns.indexOf(key) === -1 ? "" : "hidden"}>{obj[key] || alt}</td>;
			};
			rows.push(
				<tr>
					<td className="td-card">
						<div className="card-wrapper">
							<CardTile card={obj.card} count={1} rarityColored height={34} />
						</div>
					</td>
					{cell("totalGames", 0)}
					<td className={hiddenColumns.indexOf("winrate") === -1 ? "" : "hidden"} style={{color: wrData && wrData.color}}>
						{obj.winrate !== undefined ? (+obj.winrate).toFixed(1) + "%" : "-"}
					</td>
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
				headers={this.tableHeaders.filter((x) => hiddenColumns.indexOf(x.key) === -1)}
			>
				{rows}
			</SortableTable>
		);
	}

	readonly tableHeaders = [
		{key: "card", text: "Card", defaultSortDirection: "ascending" as SortDirection},
		{
			infoHeader: "Total games",
			infoText: "Number of games you played with a deck that included the card.",
			key: "totalGames",
			text: "Total games",
		},
		{
			infoHeader: "Winrate",
			infoText: "Winrate of decks including the card.",
			key: "winrate",
			text: "Winrate",
		},
		{
			infoHeader: "Times played",
			infoText: "Number of times you played the card.",
			key: "timesPlayed",
			text: "Times played",
		},
		{
			infoHeader: "Distinct decks",
			infoText: "Number of distinct decks you included the card in.",
			key: "distinctDecks",
			text: "Distinct decks",
		},
		{
			infoHeader: "Damage done",
			infoText: "Total amount of damage the card has dealt. Does not include overkills.",
			key: "damageDone",
			text: "Damage done",
		},
		{
			infoHeader: "Healing done",
			infoText: "Total amount of healing the card has done. Does not include overhealing.",
			key: "healingDone",
			text: "Healing done",
		},
		{
			infoHeader: "Heroes killed",
			infoText: "Number of heroes the card has killed.",
			key: "heroesKilled",
			text: "Heroes killed",
		},
		{
			infoHeader: "Minions killed",
			infoText: "Number of minions the card has killed.",
			key: "minionsKilled",
			text: "Minions killed",
		},
	];
}
