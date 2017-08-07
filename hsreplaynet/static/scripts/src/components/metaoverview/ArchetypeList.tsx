import * as React from "react";
import { ApiArchetype, ApiArchetypePopularity, SortableProps, SortDirection } from "../../interfaces";
import loadingHandler from "../loading/Loading";
import ArchetypeClassTable from "./ArchetypeClassTable";
import { toTitleCase } from "../../helpers";
import CardData from "../../CardData";

interface ClassArchetypeData {
	[playerClass: string]: ApiArchetypePopularity[];
}

interface ArchetypeListProps extends SortableProps, React.ClassAttributes<ArchetypeList> {
	data?: ClassArchetypeData;
	archetypeData?: ApiArchetype[];
	cardData: CardData;
	gameType: string;
}

class ArchetypeList extends React.Component<ArchetypeListProps, void> {
	render(): JSX.Element {
		const {data} = this.props;
		const tiles = Object.keys(data).sort().map((key) => this.renderClass(key, data[key]));
		return (
			<div className="class-tile-container">
				{tiles}
			</div>
		);
	}

	renderClass(playerClass: string, data: ApiArchetypePopularity[]): JSX.Element {
		return (
			<div className="tile class-tile">
				<div className="tile-title">
					<span className={`player-class ${playerClass.toLowerCase()}`}>
						{toTitleCase(playerClass)}
					</span>
				</div>
				<div className="tile-content">
					<ArchetypeClassTable
						data={data}
						archetypeData={this.props.archetypeData}
						onSortChanged={this.props.onSortChanged}
						sortBy={this.props.sortBy}
						sortDirection={this.props.sortDirection}
						gameType={this.props.gameType}
						cardData={this.props.cardData}
					/>
				</div>
			</div>
		);
	}
}

export default loadingHandler(ArchetypeList);
