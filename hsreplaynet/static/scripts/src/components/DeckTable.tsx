import * as React from "react";
import {TableSeriesData} from "../interfaces";
import DeckTableRow from "./DeckTableRow";
import {toTitleCase} from "../helpers";

interface DeckTableProps extends React.ClassAttributes<DeckTable> {
	cardData: Map<string, any>
	tableSeries: TableSeriesData;
	numRows: number;
}

export default class DeckTable extends React.Component<DeckTableProps, any> {
	render(): JSX.Element {
		const deckRows = [];

		if (this.props.cardData && this.props.tableSeries) {
			const dataRows = [];
			let foundAny = false;
			let index = 0;
			do {
				foundAny = false;
				Object.keys(this.props.tableSeries).forEach(key => {
					const data = this.props.tableSeries[key][index];
					if (data) {
						foundAny = true;
						dataRows.push(data);
					}
				});
				index++;
			}
			while (foundAny && dataRows.length < 20);
			console.log(dataRows)

			dataRows.sort((a, b) => +a["win_rate"] < +b["win_rate"] ? 1 : -1);

			dataRows.forEach(row => {
				const card = this.props.cardData.get(this.getHeroId(row["player_class"]));
				console.log(row["player_class"], card)
				deckRows.push(
					<DeckTableRow
						card={card}
						cardText={toTitleCase(row["player_class"])}
						winrate={+row["win_rate"]}
						deckId={row["deck_id"]}
					/>
				);
			})
		}
		return <div className="table-wrapper">
			<table className="table table-striped">
				<thead>
				<tr>
					<th>Deck</th>
					<th>Winrate</th>
				</tr>
				</thead>
				<tbody>
					{deckRows}
				</tbody>
			</table>
		</div>;
	}

	getHeroId(playerClass: string) {
		switch(playerClass.toUpperCase()) {
			case "DRUID": return "274";
			case "HUNTER": return "31";
			case "MAGE": return "813";
			case "PALADIN": return "671"
			case "PRIEST": return "637";
			case "ROGUE": return "930";
			case "SHAMAN": return "1066"
			case "WARLOCK": return "893";
			case "WARRIOR": return "7";
		}
	}
}
