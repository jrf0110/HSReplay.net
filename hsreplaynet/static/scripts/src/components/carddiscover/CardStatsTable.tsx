import * as React from "react";
import { cardObjSorting, cardSorting, toDynamicFixed, toPrettyNumber, winrateData } from "../../helpers";
import { TableData } from "../../interfaces";
import CardTile from "../CardTile";
import SortableTable, { SortDirection } from "../SortableTable";
import * as numeral from "numeral";

numeral.register("locale", "de", {
	delimiters: {
		thousands: ".",
		decimal: ",",
	},
	abbreviations: {
		thousand: "K",
		million: "M",
		billion: "B",
		trillion: "T",
	},
	ordinal: (number) => ".",
	currency: {
		symbol: "€",
	},
});

numeral.locale("de");

numeral.register("format", "smooth", {
	regexps: {
		format: /(~)/,
		unformat: /(~)/,
	},
	format: function(value: number, format: string, roundingFunction: (number) => number): string {
		const divisor = 10 ** (Math.floor(Math.log10(value)) - 1);
		value = Math.floor(value / divisor) * divisor;

		let output = (numeral as any)._.numberToFormat(value, format, roundingFunction);
		return output;
	},
	unformat: function(string: string): number {
		return +string;
	}
});

interface CardsTableProps {
	cards: any[];
	gameType: string;
	hiddenColumns?: string[];
	included?: TableData;
	numCards: number;
	onSortChanged: (sortBy: string, sortDirection: SortDirection) => void;
	played?: TableData;
	playerClass: string;
	sortBy: string;
	sortDirection: SortDirection;
	showSparseWarning?: boolean;
	showAll: () => void;
}

export default class CardStatsTable extends React.Component<CardsTableProps, void> {
	render(): JSX.Element {
		const rows = [];
		const cardObjs = [];
		const dataKey = this.props.playerClass === "NEUTRAL" ? "ALL" : this.props.playerClass;

		this.props.cards.forEach((card) => {
			const included = this.props.included.series.data[dataKey].find((x) => x.dbf_id === card.dbfId);
			const played = this.props.played.series.data[dataKey].find((x) => x.dbf_id === card.dbfId);
			const includedCount = included && +included.count;
			const includedDecks = included && +included.decks;
			const includedPopularity = included && +included.popularity;
			const includedWinrate = included && +included.win_rate;
			const playedPopularity = played && +played.popularity;
			const playedWinrate = played && +played.win_rate;
			const timesPlayed = played && +played.total;
			cardObjs.push({
				card, includedCount, includedDecks, includedPopularity, includedWinrate,
				playedPopularity, playedWinrate, timesPlayed,
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

		let postfix = null;
		const warnFields = ["includedPopularity", "timesPlayed", "includedWinrate", "playedWinrate"];
		if (this.props.showSparseWarning) {
			const warning = (
				<tr className="help-row">
					<td colSpan={6} className="text-center">
						Some cards were hidden due to a low amount of data.
						{this.props.showAll ? <a
							href="#"
							className="btn btn-default"
							onClick={(event) => {
								event.preventDefault();
								this.props.showAll();
							}}
						>
							Show sparse data
						</a> : null}
					</td>
				</tr>
			);
			if (direction === -1 && warnFields.indexOf(sortBy) !== -1) {
				rows.push(warning);
			}
			else {
				postfix = warning;
			}
		}

		cardObjs.slice(0, this.props.numCards).forEach((obj) => {
			const includedWrData = obj.includedWinrate && winrateData(50, obj.includedWinrate, 3);
			const playedWrData = obj.playedWinrate && winrateData(50, obj.playedWinrate, 3);
			const urlGameType = this.props.gameType !== "RANKED_STANDARD" ? this.props.gameType : undefined;
			rows.push(
				<tr>
					<td>
						<div className="card-wrapper">
							<CardTile card={obj.card} count={1} rarityColored height={34}/>
						</div>
					</td>
					<td>
						{numeral(obj.includedPopularity / 100).format("0.00%")}
					</td>
					<td>
						{numeral(obj.includedCount).format("0.[00]")}
					</td>
					<td style={{color: includedWrData && includedWrData.color}}>
						{numeral(obj.includedWinrate / 100).format("0.0%")}
					</td>
					<td>
						{numeral(obj.timesPlayed).format("~0,000") + " (" + (numeral(obj.playedPopularity / 100) as any).format("0.[000]%", (x) => {
							let y = toDynamicFixed(+x);
							console.log(x, y);
							return y;
						}) + ")"}
					</td>
					<td style={{color: playedWrData && playedWrData.color}}>
						{numeral(obj.playedWinrate / 100).format("0.0%")}
					</td>
				</tr>,
			);
		});

		if (postfix) {
			rows.push(postfix);
		}

		const tableHeaders = [
			{key: "card", text: "Card", defaultSortDirection: "ascending" as SortDirection},
			{key: "includedPopularity", text: "In % of decks", infoHeader: "Included in % of decks", infoText: "Percentage of decks that include at least one copy of the card."},
			{key: "includedCount", text: "Copies", infoHeader: "Copies in deck", infoText: "Average number of copies in a deck."},
			{key: "includedWinrate", text: "Deck winrate", infoHeader: "Deck Winrate", infoText: "Average winrate of decks that include this card."},
			{key: "timesPlayed", text: "Times played", infoHeader: "Times played", infoText: "Number of times the card was played."},
			{key: "playedWinrate", text: "Played winrate", infoHeader: "Winrate when played", infoText: "Average winrate of matches where the card was played."},
		];

		return (
			<SortableTable
				sortBy={sortBy}
				sortDirection={sortDirection}
				onSortChanged={this.props.onSortChanged}
				headers={tableHeaders}
			>
				{rows}
			</SortableTable>
		);
	}
}
