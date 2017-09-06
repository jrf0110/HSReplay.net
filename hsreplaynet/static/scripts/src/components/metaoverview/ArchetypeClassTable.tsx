import * as React from "react";
import { ApiArchetype, ApiArchetypePopularity, SortableProps } from "../../interfaces";
import Table, { TableColumn } from "../tables/Table";
import Tooltip from "../Tooltip";
import ArchetypeSignature from "../archetypedetail/ArchetypeSignature";
import DataInjector from "../DataInjector";
import CardData from "../../CardData";
import ArchetypeSignatureTooltip from "./ArchetypeSignatureTooltip";

interface ArchetypeClassTableProps extends SortableProps, React.ClassAttributes<ArchetypeClassTable> {
	data: ApiArchetypePopularity[];
	archetypeData: ApiArchetype[];
	gameType: string;
	cardData: CardData;
	playerClass: string;
}

const CELL_HEIGHT = 36;
const MIN_COLUMN_WIDTH = 100;
const MAX_HEADER_WIDTH = 217;
const MIN_HEADER_WIDTH = 150;

export default class ArchetypeClassTable extends React.Component<ArchetypeClassTableProps, {}> {
	render(): JSX.Element {
		const {data, playerClass, sortBy, sortDirection} = this.props;
		const rows  = [];
		data.forEach((datum) => {
			const archetype = this.props.archetypeData.find((a) => a.id === datum.archetype_id);
			if (archetype) {
				rows.push({archetype_name: archetype.name, archetype, ...datum});
			}
			else {
				rows.push({
					archetype: {
						id: -1,
						name: "Other",
						player_class_name: playerClass,
					},
					archetype_name: "Other",
					...datum,
				});
			}
		});
		const {dataKey} = this.columns.find((c) => c.sortKey === sortBy);
		const direction = sortDirection === "ascending" ? 1 : -1;
		rows.sort((a, b) => {
			if (dataKey === "archetype_name") {
				if (a.archetype_id === -1) {
					return direction;
				}
				if (b.archetype_id === -1) {
					return -direction;
				}
			}
			return a[dataKey] > b[dataKey] ? direction : -direction;
		});

		const rowData = rows.map((row) => {
			return {
				data: [
					this.renderHeader(row.archetype),
					...this.columns.slice(1).map((c) => row[c.dataKey]),
				],
				href: row.archetype.url,
			};
		});

		return (
			<Table
				cellHeight={CELL_HEIGHT}
				minColumnWidth={MIN_COLUMN_WIDTH}
				headerWidth={[MIN_HEADER_WIDTH, MAX_HEADER_WIDTH]}
				baseWinrate={50}
				sortBy={sortBy}
				sortDirection={sortDirection}
				onSortChanged={this.props.onSortChanged}
				columns={this.columns}
				rowData={rowData}
				rowHighlighting={true}
			/>
		);
	}

	renderHeader(archetype: ApiArchetype) {
		const name = (
			<a
				className={"player-class " + archetype.player_class_name.toLowerCase()}
				href={archetype.url}
			>
				{archetype.name}
			</a>
		);
		if (archetype.id === -1) {
			return  name;
		}

		return (
			<ArchetypeSignatureTooltip
				key={archetype.id}
				cardData={this.props.cardData}
				archetypeId={archetype.id}
				archetypeName={archetype.name}
				gameType={this.props.gameType}
			>
				{name}
			</ArchetypeSignatureTooltip>
		);
	}

	readonly columns: TableColumn[] = [
		{
			dataKey: "archetype_name",
			sortKey: "archetype",
			text: "Archetype",
		},
		{
			dataKey: "win_rate",
			sortKey: "winrate",
			text: "Winrate",
			winrateData: true,
		},
		{
			dataKey: "pct_of_class",
			percent: true,
			sortKey: "games",
			text: "Popularity",
		},
		{
			dataKey: "total_games",
			prettify: true,
			sortKey: "games",
			text: "Games",
		},
	];
}
