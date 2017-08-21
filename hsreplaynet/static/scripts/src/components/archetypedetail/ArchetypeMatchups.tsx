import * as React from "react";
import ClassMatchup from "../ClassMatchup";
import {ApiArchetype} from "../../interfaces";

interface ArchetypeMatchupsProps extends React.ClassAttributes<ArchetypeMatchups> {
	archetypeId: number;
	archetypeMatchupData?: any;
	archetypeData?: any;
}

export default class ArchetypeMatchups extends React.Component<ArchetypeMatchupsProps, {}> {
	render(): JSX.Element {
		const matchupsTiles = [];

		const archetypeMatchups = this.props.archetypeMatchupData.series.data["" + this.props.archetypeId];
		if (!archetypeMatchups) {
			return <h3 className="message-wrapper">No data available.</h3>;
		}

		const opponentClasses = {};
		Object.keys(archetypeMatchups).forEach((opponentId) => {
			const opponentArchetype = this.getArchetype(+opponentId);
			if (opponentArchetype) {
				const matchup = archetypeMatchups[opponentId];
				if (!opponentClasses[opponentArchetype.player_class_name]) {
					opponentClasses[opponentArchetype.player_class_name] = [];
				}
				opponentClasses[opponentArchetype.player_class_name].push({
					id: opponentArchetype.id,
					name: opponentArchetype.name,
					winrate: matchup.win_rate,
				});
			}
		});

		Object.keys(opponentClasses).sort().forEach((opponentPlayerClass, i) => {
			matchupsTiles.push(
				<ClassMatchup
					archetypes={opponentClasses[opponentPlayerClass]}
					playerClass={opponentPlayerClass}
				/>,
			);
			if ((i + 1) % 2 === 0) {
				matchupsTiles.push(<div className="clearfix visible-md-block"/>);
			}
			if ((i + 1) % 3 === 0) {
				matchupsTiles.push(<div className="clearfix visible-lg-block"/>);
			}

		});
		if (matchupsTiles.length) {
			return <div className="archetype-matchups">{matchupsTiles}</div>;
		}
		return <h3 className="message-wrapper">No data available.</h3>;
	}

	getArchetype(archetypeId: number): ApiArchetype {
		return this.props.archetypeData.find((x) => x.id === archetypeId);
	}
}
