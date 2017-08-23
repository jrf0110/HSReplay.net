import * as React from "react";
import ClassMatchup from "../ClassMatchup";
import {ApiArchetype, ApiArchetypePopularity, SortableProps} from "../../interfaces";
import {withLoading} from "../loading/Loading";
import ClassArchetypesTile from "../metaoverview/ClassArchetypesTile";
import CardData from "../../CardData";

interface ArchetypeMatchupsProps extends SortableProps, React.ClassAttributes<ArchetypeMatchups> {
	archetypeId: number;
	archetypeMatchupData?: any;
	archetypeData?: any;
	cardData?: CardData;
	gameType?: string;
}

class ArchetypeMatchups extends React.Component<ArchetypeMatchupsProps, {}> {
	render(): JSX.Element {
		const {archetypeMatchupData, archetypeId} = this.props;
		const archetypeMatchups = archetypeMatchupData.series.data["" + archetypeId];

		const opponentClasses: {[key: string]: ApiArchetypePopularity[]} = {};
		const games: {[key: string]: number} = {};
		Object.keys(archetypeMatchups).forEach((opponentId) => {
			const opponentArchetype = this.getArchetype(+opponentId);
			if (opponentArchetype) {
				const opponentClass = opponentArchetype.player_class_name;
				const matchup = archetypeMatchups[opponentId];
				if (!opponentClasses[opponentClass]) {
					opponentClasses[opponentClass] = [];
				}
				games[opponentClass] = (games[opponentClass] || 0) + matchup.total_games;
				opponentClasses[opponentClass].push({
					archetype_id: +opponentArchetype.id,
					pct_of_class: matchup.total_games,
					pct_of_total: 0,
					total_games: matchup.total_games,
					win_rate: matchup.win_rate,
				});
			}
		});

		Object.keys(opponentClasses).forEach((key) => {
			opponentClasses[key].forEach((data) => {
				data.pct_of_class *= 100.0 / games[key];
			});
		});

		const tiles = Object.keys(opponentClasses).sort().map((key) => (
			<ClassArchetypesTile
				archetypeData={this.props.archetypeData}
				cardData={this.props.cardData}
				data={opponentClasses[key]}
				gameType={this.props.gameType}
				onSortChanged={this.props.onSortChanged}
				playerClass={key}
				sortBy={this.props.sortBy}
				sortDirection={this.props.sortDirection}
			/>
		));
		return (
			<div className="class-tile-container">
				{tiles}
			</div>
		);
	}

	getArchetype(archetypeId: number): ApiArchetype {
		return this.props.archetypeData.find((x) => x.id === archetypeId);
	}
}

export default withLoading(["archetypeMatchupData", "archetypeData"])(ArchetypeMatchups);
