import * as React from "react";
import ClassMatchup, { ArchetypeData } from "../ClassMatchup";

interface DeckMatchupsProps extends React.ClassAttributes<DeckMatchups> {
	archetypeMatchupData?: any;
	classMatchupData?: any;
	archetypeData?: any;
}

export default class DeckMatchups extends React.Component<DeckMatchupsProps, void> {
	render(): JSX.Element {
		const matchupsTiles = [];
		const matchupData = this.props.classMatchupData.series.data;
		const playerClasses = Object.keys(matchupData).filter((playerClass) => matchupData[playerClass].length);
		playerClasses.sort();
		playerClasses.forEach((playerClass: string, i: number) => {
			if (matchupData[playerClass].length) {
				matchupsTiles.push(
					<ClassMatchup
						archetypes={this.getArchetypes(playerClass)}
						playerClass={playerClass}
						totalWinrate={matchupData[playerClass][0].winrate}
					/>,
				);
				if ((i + 1) % 2 === 0) {
					matchupsTiles.push(<div className="clearfix visible-md-block"/>);
				}
				if ((i + 1) % 3 === 0) {
					matchupsTiles.push(<div className="clearfix visible-lg-block"/>);
				}
			}
		});
		return <div className="deck-matchups">{matchupsTiles}</div>;
	}

	getArchetypes(playerClass: string): ArchetypeData[] {
		return this.props.archetypeMatchupData.series.data[playerClass].map((archetype) => {
			const data = this.props.archetypeData.results.find((a) => a.id === archetype.archetype_id);
			return {name: data.name, winrate: archetype.win_rate};
		});
	}
}
