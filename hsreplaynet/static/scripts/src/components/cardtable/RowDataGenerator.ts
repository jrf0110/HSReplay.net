import {CardObj, SortDirection, TableData} from "../../interfaces";
import {CardTableColumn} from "./CardTableColumns";
import {cardSorting} from "../../helpers";

export interface CardData {
	card: CardObj;
	data: any;
}

export interface CardTableRowData {
	card: CardObj;
	values: Array<number|string>;
}

export interface ApiCardStatsData {
	[key: string]: any;
}

export function generateCardTableRowData(
	cards: CardObj[],
	data: ApiCardStatsData[],
	sortBy: string,
	sortDirection: SortDirection,
	columns: CardTableColumn[],
) {
	const cardData = generateCardData(cards, data);
	const sortedCardData = sortCardData(cardData, sortBy, sortDirection, columns);
	const rowData = generateRowData(sortedCardData, columns);
	return rowData;
}

function generateCardData(cards: CardObj[], data: ApiCardStatsData[]): CardData[] {
	return cards.map((cardObj: CardObj) => {
		return {
			card: cardObj,
			data: data.find((x) => x.dbf_id === cardObj.card.dbfId),
		};
	});
}

function sortCardData(
	cardData: CardData[],
	sortBy: string,
	sortDirection: SortDirection,
	columns: CardTableColumn[],
): CardData[] {
	const direction = sortDirection === "descending" ? 1 : -1;
	cardData = cardData.slice();
	if (sortBy === "card") {
		cardData.sort((a, b) => cardSorting(a.card.card, b.card.card, -direction));
	}
	else {
		const key = columns.find((x) => x.sortKey === sortBy).dataKey;
		cardData.sort((a, b) => {
			return (b.data[key] - a.data[key]) * direction
				|| (a.card.card.name > b.card.card.name ? -direction : direction);
		});
	}
	return cardData;
}

function generateRowData(cardData: CardData[], columns: CardTableColumn[]): CardTableRowData[] {
	return cardData.map(({card, data}) => {
		return {
			card: {card: card.card, count: card.count},
			values: columns.map((x) => data[x.dataKey]),
		};
	});
}
