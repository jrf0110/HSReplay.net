import * as React from "react";
import ArchetypeTableRow from "./ArchetypeTableRow";
import {GameReplay, CardArtProps, ImageProps, GlobalGamePlayer, ArchetypeData} from "../interfaces";

interface TableSorting {
	columnName: string;
	descending: boolean;
}

interface ArchetypeTableProps extends React.ClassAttributes<ArchetypeTable> {
	data: ArchetypeData;
	deckData: Map<string, any>;
	selectedArchetype?: string;
	selectedChanged?: (name: string) => void;
	offset?: number;
	count?: number;
	headerClicked?: (name: string) => void;
}

interface ArchetypeTableState {
	tableSorting?: TableSorting;
}

interface Data {
	name: string;
	winrate: number;
	wins: number;
	matches: number;
	selected: boolean;
	heroClassName: string;
}

export default class ArchetypeTable extends React.Component<ArchetypeTableProps, ArchetypeTableState> {
	constructor(props: ArchetypeTableProps, state: ArchetypeTableState) {
		super(props, state);
		this.state = {
			tableSorting: null,
		}
	}

	render(): JSX.Element {
		let columns = [];
		let data: Data[] = [];
		if (this.props.data && this.props.data.winrates) {
			Object.keys(this.props.data.winrates).forEach(key => {
				let winrate = 0.0;
				let wins = 0;
				let matches = 0;
				let keys = Object.keys(this.props.data.winrates[key]);
				keys.forEach(innerKey => {
					let arch = this.props.data.winrates[key][innerKey];
					if (arch.match_count > 0) {
						wins += arch.friendly_wins;
						matches += arch.match_count;
					}
				});
				const selected = this.props.selectedArchetype === key;
				const heroClassName = this.props.deckData && this.props.deckData.get(key).player_class_name;
				if (matches > 0) {
					data.push({name: key, winrate: (wins / matches), wins, matches, selected, heroClassName});
				}
			});
		}
		if (this.state.tableSorting) {
			const sortField = this.state.tableSorting.columnName;
			const foo = this.state.tableSorting.descending ? -1 : 1;
			const bar = this.state.tableSorting.descending ? 1 : -1;
			data = data.sort((a, b) => a[sortField] > b[sortField] ? foo : bar);
		}
		data.forEach((data, i) => {
			if (i < this.props.offset || i >= this.props.offset + this.props.count) {
				return;
			}
			columns.push(
				<ArchetypeTableRow
					key={i}
					archetype={data.name}
					heroClassName={data.heroClassName}
					winrate={data.winrate}
					wins={data.wins}
					matches={data.matches}
					selected={data.selected}
					onClick={() => this.props.selectedChanged(data.name)}
				/>
			);
		})
		return (
			<div className="hsrtable" id="match-hsrtable">
				<div className="hsrtable-header">
					<div className="hsrtable-row">
						<div className="hsrtable-cell sortable" onClick={() => this.setState({tableSorting: this.nextSortingState("name")})}>Archetype {this.sortingIndicator("name")}</div>
					</div>
				</div>
				<div className="hsrtable-body">
					{columns}
				</div>
			</div>
		);
	}

	sortingIndicator(name: string): string {
		return this.state.tableSorting && this.state.tableSorting.columnName === name ? (this.state.tableSorting.descending ? "▼" : "▲") : "";
	}

	nextSortingState(columnName: string): TableSorting {
		let descending = !(this.state.tableSorting && columnName === this.state.tableSorting.columnName && this.state.tableSorting.descending);
		return {columnName, descending};
	}
}
