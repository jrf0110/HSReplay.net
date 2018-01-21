import React from "react";
import {ApiArchetype, ApiArchetypePopularity, SortableProps} from "../../interfaces";
import CardData from "../../CardData";
import {toTitleCase} from "../../helpers";
import ArchetypeClassTable from "./ArchetypeClassTable";

interface ClassArchetypesTileProps extends SortableProps, React.ClassAttributes<ClassArchetypesTile> {
	data: ApiArchetypePopularity[];
	archetypeData: ApiArchetype[];
	playerClass: string;
	cardData: CardData;
	gameType: string;
	totalPopularity?: boolean;
}

export default class ClassArchetypesTile extends React.Component<ClassArchetypesTileProps, {}> {
	render(): JSX.Element {
		const {playerClass} = this.props;
		return (
			<div className="tile class-tile">
				<div className="tile-title">
					<span className={`player-class ${playerClass.toLowerCase()}`}>
						{toTitleCase(playerClass)}
					</span>
				</div>
				<div className="tile-content">
					<ArchetypeClassTable
						data={this.props.data}
						archetypeData={this.props.archetypeData}
						onSortChanged={this.props.onSortChanged}
						sortBy={this.props.sortBy}
						sortDirection={this.props.sortDirection}
						gameType={this.props.gameType}
						cardData={this.props.cardData}
						playerClass={playerClass}
						totalPopularity={this.props.totalPopularity}
					/>
				</div>
			</div>
		);
	}
}
