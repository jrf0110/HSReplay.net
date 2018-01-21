import React from "react";
import { ApiArchetype, ApiArchetypePopularity, SortableProps, SortDirection } from "../../interfaces";
import { withLoading } from "../loading/Loading";
import ArchetypeClassTable from "./ArchetypeClassTable";
import { toTitleCase } from "../../helpers";
import CardData from "../../CardData";
import ClassArchetypesTile from "./ClassArchetypesTile";
import LowDataWarning from "./LowDataWarning";

interface ClassArchetypeData {
	[playerClass: string]: ApiArchetypePopularity[];
}

interface ArchetypeListProps extends SortableProps, React.ClassAttributes<ArchetypeList> {
	data?: ClassArchetypeData;
	archetypeData?: ApiArchetype[];
	cardData: CardData;
	gameType: string;
	timestamp?: string;
}

class ArchetypeList extends React.Component<ArchetypeListProps, {}> {
	render(): JSX.Element {
		const {data} = this.props;
		const tiles = Object.keys(data).sort().map((key) => (
			<ClassArchetypesTile
				archetypeData={this.props.archetypeData}
				cardData={this.props.cardData}
				data={data[key]}
				gameType={this.props.gameType}
				onSortChanged={this.props.onSortChanged}
				playerClass={key}
				sortBy={this.props.sortBy}
				sortDirection={this.props.sortDirection}
				totalPopularity={true}
			/>
		));
		return (
			<div className="class-tile-container">
					<LowDataWarning
						date={new Date(this.props.timestamp)}
						numArchetypes={Object.keys(data).map((key) => data[key].length).reduce((a, b) => a + b)}
					/>
				{tiles}
			</div>
		);
	}
}

export default withLoading()(ArchetypeList);
