import * as React from "react";
import ClassMatchup from "../ClassMatchup";
import { getPlayerClassFromId } from "../../helpers";

interface ArchetypeMatchupsProps extends React.ClassAttributes<ArchetypeMatchups> {
	archetypeId: number;
	archetypeMatchupData?: any;
	archetypeData?: any;
}

export default class ArchetypeMatchups extends React.Component<ArchetypeMatchupsProps, void> {
	render(): JSX.Element {
		const matchupsTiles = [];
		const playerClass = this.getPlayerClassName(this.props.archetypeId);
		if (!playerClass) {
			return <h3 className="message-wrapper">Something went wrong.</h3>;
		}
		const classMatchups = this.props.archetypeMatchupData.series.data[playerClass];
		const archetypeMatchups = classMatchups.filter((matchup) => matchup.friendly_archetype_id === this.props.archetypeId);
		const opponentClasses = {};
		archetypeMatchups.forEach((matchup) => {
			const opponentPlayerClass = this.getPlayerClassName(matchup.opponent_archetype_id);
			if (opponentPlayerClass) {
				if (!opponentClasses[opponentPlayerClass]) {
					opponentClasses[opponentPlayerClass] = [];
				}
				opponentClasses[opponentPlayerClass].push({
					id: matchup.opponent_archetype_id,
					name: this.getArchetypeName(matchup.opponent_archetype_id),
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

	getPlayerClassName(archetypeId: number): string {
		const archetype = this.props.archetypeData.results.find((x) => x.id === archetypeId);
		if (archetype && archetype.player_class) {
			return getPlayerClassFromId(archetype.player_class);
		}
		return null;
	}

	getArchetypeName(archetypeId: number): string {
		const archetype = this.props.archetypeData.results.find((x) => x.id === archetypeId);
		if (archetype) {
			return archetype.name;
		}
		return null;
	}
}
