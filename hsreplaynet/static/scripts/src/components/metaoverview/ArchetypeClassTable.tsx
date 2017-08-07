import * as React from "react";
import { ApiArchetype, ApiArchetypePopularity, SortableProps } from "../../interfaces";
import Table, { TableColumn } from "../tables/Table";
import Tooltip from "../Tooltip";
import ArchetypeSignature from "../archetypedetail/ArchetypeSignature";
import DataInjector from "../DataInjector";
import { extractSignature } from "../../extractors";
import CardData from "../../CardData";

interface ArchetypeClassTableProps extends SortableProps, React.ClassAttributes<ArchetypeClassTable> {
	data: ApiArchetypePopularity[];
	archetypeData: ApiArchetype[];
	gameType: string;
	cardData: CardData;
}

const CELL_HEIGHT = 36;
const MIN_COLUMN_WIDTH = 100;
const MAX_HEADER_WIDTH = 217;
const MIN_HEADER_WIDTH = 150;

export default class ArchetypeClassTable extends React.Component<ArchetypeClassTableProps, void> {
	render(): JSX.Element {
		const {data, sortBy, sortDirection} = this.props;
		const rows  = [];
		data.forEach((datum) => {
			const archetype = this.props.archetypeData.find((a) => a.id === datum.archetype_id);
			if (archetype) {
				rows.push({archetype_name: archetype.name, archetype, ...datum});
			}
		});
		const {dataKey} = this.columns.find((c) => c.sortKey === sortBy);
		const direction = sortDirection === "ascending" ? 1 : -1;
		rows.sort((a, b) => a[dataKey] > b[dataKey] ? direction : -direction);

		const rowData = rows.map((row) => ([
			this.renderHeader(row.archetype),
			...this.columns.slice(1).map((c) => row[c.dataKey]),
		]));

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
			/>
		);
	}

	renderHeader(archetype: ApiArchetype) {
		return (
			<Tooltip
				id="tooltip-archetype-signature"
				content={this.getTooltip(archetype.id)}
				header={archetype.name}
			>
				<a
					className={"player-class " + archetype.player_class_name.toLowerCase()}
					href={archetype.url}
				>
					{archetype.name}
				</a>
			</Tooltip>
		);
	}

	getTooltip(archetypeId: number): JSX.Element {
		return (
			<div>
				<DataInjector
					query={{key: "data", params: {}, url: "/api/v1/archetypes/" + archetypeId}}
					extract={{data: (data) => extractSignature(data, this.props.gameType)}}
				>
					<ArchetypeSignature cardData={this.props.cardData} />
				</DataInjector>
				<p>Click to view archetype details</p>
			</div>
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
