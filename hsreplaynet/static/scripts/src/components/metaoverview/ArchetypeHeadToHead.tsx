import * as React from "react";
import ArchetypeMatrix from "./ArchetypeMatrix";
import { ApiArchetype, ApiArchetypeMatchupData, ApiArchetypePopularity, ArchetypeData, MatchupData, SortDirection } from "../../interfaces";
import { getPlayerClassFromId } from "../../helpers";
import UserData from "../../UserData";
import CardData from "../../CardData";

interface ArchetypeHeadToHeadProps extends React.ClassAttributes<ArchetypeHeadToHead> {
	archetypeData?: any;
	cardData: CardData;
	matchupData?: any;
	popularityData?: any;
	sortDirection?: SortDirection;
	setSortDirection?: (ascending: SortDirection) => void;
	sortBy?: string;
	setSortBy?: (prop: string) => void;
}

interface ArchetypeHeadToHeadState {
	favorites: number[];
	ignoredColumns: number[];
}

export default class ArchetypeHeadToHead extends React.Component<ArchetypeHeadToHeadProps, ArchetypeHeadToHeadState> {
	constructor(props: ArchetypeHeadToHeadProps, state: ArchetypeHeadToHeadState) {
		super();
		this.state = {
			favorites: UserData.getSetting("archetype-favorites") || [],
			ignoredColumns: UserData.getSetting("archetype-ignored") || [],
		};
	}

	render() {
		if (!this.props.matchupData || !this.props.popularityData || !this.props.archetypeData) {
			return null;
		}

		const archetypeData: ArchetypeData[] = [];

		const archetypes = this.getAllArchetypes();

		let maxPopularity = null;

		archetypes.forEach((friendly: ApiArchetype) => {
			const matchups: MatchupData[] = [];
			let effectiveWinrate = 0;
			let totalGames = 0;
			archetypes.forEach((opponent: ApiArchetype) => {
				const apiMatchup = this.getMatchup(friendly, opponent);
				matchups.push({
					friendlyId: friendly.id,
					friendlyName: friendly.name,
					friendlyPlayerClass: friendly.player_class,
					opponentId: opponent.id,
					opponentName: opponent.name,
					opponentPlayerClass: opponent.player_class,
					totalGames: apiMatchup && apiMatchup.total_games,
					winrate: apiMatchup && apiMatchup.win_rate,
				});
				if (apiMatchup && this.state.ignoredColumns.indexOf(opponent.id) === -1) {
					effectiveWinrate += apiMatchup.win_rate * apiMatchup.total_games;
					totalGames += apiMatchup.total_games;
				}
			});
			effectiveWinrate = Math.round(effectiveWinrate / (totalGames / 100)) / 100;
			const popularity = this.getPopularity(friendly);
			if (popularity && popularity.pct_of_total > 0) {
				archetypeData.push({
					id: friendly.id,
					matchups,
					name: friendly.name,
					playerClass: friendly.player_class,
					popularityClass: popularity.pct_of_class,
					popularityTotal: popularity.pct_of_total,
					winrate: popularity.win_rate,
					effectiveWinrate,
				});
				if(maxPopularity === null || popularity.pct_of_total > maxPopularity) {
					maxPopularity = popularity.pct_of_total;
				}
			}
		});

		this.sortArchetypes(archetypeData);

		const sortedIds = archetypeData.map((archetype) => archetype.id);
		archetypeData.forEach((archetype) => {
			archetype.matchups = sortedIds.map((id) => archetype.matchups.find((m) => m.opponentId === id));
		});

		return (
			<ArchetypeMatrix
				archetypes={archetypeData}
				cardData={this.props.cardData}
				favorites={this.state.favorites}
				ignoredColumns={this.state.ignoredColumns}
				onFavoriteChanged={(archetypeId: number, favorite: boolean) => this.onFavoriteChanged(archetypeId, favorite)}
				onIgnoreChanged={(archetypeId: number, ignore: boolean) => this.onIgnoreChanged(archetypeId, ignore)}
				maxPopularity={maxPopularity}
				sortBy={this.props.sortBy}
				sortDirection={this.props.sortDirection}
				onSortChanged={(sortBy: string, sortDirection: SortDirection) => {
					this.props.setSortDirection(sortDirection);
					this.props.setSortBy(sortBy);
				}}
			/>
		);
	}

	sortArchetypes(archetypes: ArchetypeData[]) {
		const direction = this.props.sortDirection === "ascending" ? 1 : -1;

		const compare = (a: ArchetypeData, b: ArchetypeData): number => {
			if (this.props.sortBy === "popularity") {
				return a.popularityTotal - b.popularityTotal;
			}
			if (this.props.sortBy === "winrate") {
				return a.effectiveWinrate - b.effectiveWinrate;
			}
			return a.playerClass > b.playerClass ? 1 : -1;
		};

		archetypes.sort((a: ArchetypeData, b: ArchetypeData) => {
			const favorite = +this.isFavorite(b.id) - +this.isFavorite(a.id);
			return favorite || (compare(a, b) || (a.name > b.name ? 1 : -1)) * direction;
		});
	}

	isFavorite(archetypeId: number): boolean {
		return this.state.favorites.indexOf(archetypeId) !== -1;
	}

	onFavoriteChanged(archetypeId: number, favorite: boolean) {
		let favorites = this.state.favorites.slice();
		favorites = favorites.filter((id) => id !== archetypeId);
		if (favorite) {
			favorites.push(archetypeId);
		}
		this.setState({favorites});
		UserData.setSetting("archetype-favorites", favorites);
	}

	onIgnoreChanged(archetypeId: number, ignore: boolean) {
		let ignoredColumns = this.state.ignoredColumns.slice();
		ignoredColumns = ignoredColumns.filter((id) => id !== archetypeId);
		if (ignore) {
			ignoredColumns.push(archetypeId);
		}
		this.setState({ignoredColumns});
		UserData.setSetting("archetype-ignored", ignoredColumns);
	}

	getAllArchetypes(): ApiArchetype[] {
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
