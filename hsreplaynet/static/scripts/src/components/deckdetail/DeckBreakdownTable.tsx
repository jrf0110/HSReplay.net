import * as React from "react";
import CardData from "../../CardData";
import { cardSorting } from "../../helpers";
import {TableData } from "../../interfaces";
import SortableTable, {SortDirection} from "../SortableTable";
import DeckBreakdownTableRow from "./DeckBreakdownTableRow";

interface DeckBreakdownTableProps {
	cardData?: CardData;
	dataKey: string;
	deckId: string;
	mulliganData?: TableData;
	onSortChanged: (sortBy: string, sortDirection: SortDirection) => void;
	playerClass: string;
	rawCardsList: string;
	sortBy: string;
	sortDirection: SortDirection;
	wildDeck: boolean;
	opponentWinrateData?: TableData;
	winrateData?: TableData;
}

export default class DeckBreakdownTable extends React.Component<DeckBreakdownTableProps, void> {
	render(): JSX.Element {
		const cardRows = [];
		const cardList = [];
		const groupedCards = this.getGroupedCards(this.props.rawCardsList.split(","));
		groupedCards.forEach((count, dbfId) => cardList.push({card: this.props.cardData.fromDbf(dbfId), count}));

		let rows = null;
		let baseDrawnWinrate = 0;
		let basePlayedWinrate = 0;
		rows = this.props.mulliganData.series.data[this.props.dataKey];

		const validRows = rows.filter((row) => row);
		validRows.forEach((row) => {
			baseDrawnWinrate += +row["win_rate_when_drawn"];
			basePlayedWinrate += +row["win_rate_when_played"];
		});
		baseDrawnWinrate /= validRows.length;
		basePlayedWinrate /= validRows.length;

		const rowList = [];
		cardList.forEach((cardObj) => {
			const row = rows && rows.find((r) => r["dbf_id"] === cardObj.card.dbfId);
			rowList.push({row, cardObj});
		});

		const direction = this.props.sortDirection === "ascending" ? 1 : -1;

		if (this.props.sortBy === "decklist") {
			rowList.sort((a, b) => cardSorting(a, b, direction));
		}
		else {
			rowList.sort((a, b) => (+a.row[this.props.sortBy] - +b.row[this.props.sortBy]) * direction);
		}

		let baseWinrate = 50;
		if (this.props.winrateData) {
			const deck = this.props.winrateData.series.data[this.props.playerClass]
				.find((x) => x.deck_id === this.props.deckId);
			if (deck) {
				baseWinrate = +deck.win_rate;
			}
		}
		else if (this.props.opponentWinrateData) {
			baseWinrate = +this.props.opponentWinrateData.series.data[this.props.dataKey][0].winrate;
		}

		rowList.forEach((item, index) => {
			cardRows.push(
				<DeckBreakdownTableRow
					cardObj={item.cardObj}
					baseDrawnWinrate={baseDrawnWinrate}
					baseMulliganWinrate={baseWinrate}
					basePlayedWinrate={basePlayedWinrate}
					row={item.row}
					wildDeck={this.props.wildDeck}
				/>,
			);
		});

		const tableHeaders = [
			{key: "decklist", text: "Card", defaultSortDirection: "ascending" as SortDirection},
			{key: "opening_hand_win_rate", text: "Mulligan WR", infoHeader: "Mulligan Winrate", infoText: "Winrate when the card ends up in the opening hand." },
			{key: "keep_percentage", text: "Kept", infoHeader: "Kept", infoText: "Percentage the card was kept when presented during mulligan." },
			{key: "win_rate_when_drawn", text: "Drawn WR", infoHeader: "Drawn Winrate", infoText: "Average winrate of games where the card was drawn at any point." },
			{key: "win_rate_when_played", text: "Played WR", infoHeader: "Played Winrate", infoText: "Average winrate of games where the card was played at any point." },
			{key: "avg_turns_in_hand", text: "Turns held", infoHeader: "Turns held", infoText: "Average number of turn the card is held in hand."},
			{key: "avg_turn_played_on", text: "Turn played", infoHeader: "Turn played", infoText: "Average turn the card is played on." },
		];

		return (
			<SortableTable
				headers={tableHeaders}
				onSortChanged={this.props.onSortChanged}
				sortBy={this.props.sortBy}
				sortDirection={this.props.sortDirection as SortDirection}
			>
				{cardRows}
			</SortableTable>
		);
	}

	getGroupedCards(cards: string[]): Map<string, number> {
		let map = new Map<string, number>();
		cards.forEach((c) => map = map.set(c, (map.get(c) || 0) + 1));
		return map;
	}

}
