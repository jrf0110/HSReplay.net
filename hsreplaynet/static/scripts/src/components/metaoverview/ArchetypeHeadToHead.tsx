import * as React from "react";
import ArchetypeMatrix from "./ArchetypeMatrix";
import { ApiArchetype, ApiArchetypeMatchupData, ApiArchetypePopularity, ArchetypeData, MatchupData } from "../../interfaces";
import { getPlayerClassFromId } from "../../helpers";

interface ArchetypeHeadToHeadProps extends React.ClassAttributes<ArchetypeHeadToHead> {
	archetypeData?: any;
	matchupData?: any;
	popularityData?: any;
}

interface ArchetypeHeadToHeadState {
	favorites: number[];
	ignoredColumns: number[];
}

export default class ArchetypeHeadToHead extends React.Component<ArchetypeHeadToHeadProps, ArchetypeHeadToHeadState> {
	constructor(props: ArchetypeHeadToHeadProps, state: ArchetypeHeadToHeadState) {
		super();
		this.state = {
			favorites: [],
			ignoredColumns: [],
		};
	}

	render() {
		if (!this.props.matchupData || !this.props.popularityData || !this.props.archetypeData) {
			return null;
		}

		const archetypes: ArchetypeData[] = [];

		const archetypeIds = this.getAllArchetypeIds();
		archetypeIds.forEach((friendly: ApiArchetype) => {
			const matchups: MatchupData[] = [];
			archetypeIds.forEach((opponent: ApiArchetype) => {
				const apiMatchup = this.getMatchup(friendly, opponent);
				matchups.push({
					friendlyId: friendly.id,
					friendlyName: friendly.name,
					friendlyPlayerClass: friendly.player_class,
					opponentId: opponent.id,
					opponentName: opponent.name,
					opponentPlayerClass: opponent.player_class,
					totalGames: apiMatchup.total_games,
					winrate: apiMatchup.win_rate,
				});
			});
			const apiPopularity = this.getPopularity(friendly);
			archetypes.push({
				id: friendly.id,
				matchups,
				name: friendly.name,
				playerClass: friendly.player_class,
				popularityClass: apiPopularity.pct_of_class,
				popularityTotal: apiPopularity.pct_of_total,
				winrate: apiPopularity.win_rate,
			});
		});

		return (
			<ArchetypeMatrix
				archetypes={archetypes}
				favorites={this.state.favorites}
				ignoredColumns={this.state.ignoredColumns}
			/>
		);
	}

	getAllArchetypeIds(): ApiArchetype[] {
		const matchupData = this.props.matchupData.series.data;
		const archetypeIds = [];
		Object.keys(matchupData).forEach((playerClass: string) => {
			matchupData[playerClass].forEach((matchup: ApiArchetypeMatchupData) => {
				if (archetypeIds.indexOf(matchup.friendly_archetype_id) === -1) {
					archetypeIds.push(matchup.friendly_archetype_id);
				}
				if (archetypeIds.indexOf(matchup.opponent_archetype_id) === -1) {
					archetypeIds.push(matchup.opponent_archetype_id);
				}
			});
		});
		return archetypeIds.map((id) => this.getApiArchetype(id));
	}

	getApiArchetype(id: number): ApiArchetype {
		const archetype = this.props.archetypeData.results.find((a) => a.id === id);
		return archetype && {
			id: archetype.id,
			name: archetype.name,
			player_class: getPlayerClassFromId(archetype.player_class),
		};
	}

	getMatchup(friendly: ApiArchetype, opponent: ApiArchetype): ApiArchetypeMatchupData {
		return this.props.matchupData.series.data[friendly.player_class].find((m) => {
			return m.friendly_archetype_id === friendly.id && m.opponent_archetype_id === opponent.id;
		});
	}

	getPopularity(archetype: ApiArchetype): ApiArchetypePopularity {
		return this.props.popularityData.series.data[archetype.player_class].find((a) => {
			return a.archetype_id === archetype.id;
		});
	}

}
