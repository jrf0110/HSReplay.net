import * as React from "react";
import ArchetypeMatrix from "./ArchetypeMatrix";
import {
	ApiArchetype,
	ApiArchetypeMatchupData,
	ApiArchetypePopularity,
	ArchetypeData,
	MatchupData,
	SortDirection,
} from "../../interfaces";
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
	customWeights: any;
	favorites: number[];
	ignoredColumns: number[];
	useCustomWeights: boolean;
}

const popularityCutoff = 1;

export default class ArchetypeHeadToHead extends React.Component<ArchetypeHeadToHeadProps, ArchetypeHeadToHeadState> {
	constructor(props: ArchetypeHeadToHeadProps, state: ArchetypeHeadToHeadState) {
		super();
		this.state = {
			customWeights: UserData.getSetting("archetype-custom-popularities") || {},
			favorites: UserData.getSetting("archetype-favorites") || [],
			ignoredColumns: UserData.getSetting("archetype-ignored") || [],
			useCustomWeights: false,
		};
	}

	render() {
		if (!this.props.matchupData || !this.props.popularityData || !this.props.archetypeData) {
			return null;
		}

		const archetypeData: ArchetypeData[] = [];
		const {archetypeIds, archetypes} = this.getAllArchetypes();

		let maxPopularity = null;
		const useCustomWeights = this.state.useCustomWeights;

		const visibleArchetypes = archetypes.filter((archetype) => {
			const popularity = this.getPopularity(archetype);
			return popularity && (popularity.pct_of_total >= popularityCutoff || this.isFavorite(archetype.id));
		});

		visibleArchetypes.forEach((friendly: ApiArchetype) => {
			const matchups: MatchupData[] = [];
			let effectiveWinrate = 0;
			let totalGames = 0;

			visibleArchetypes.forEach((opponent: ApiArchetype) => {
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
					const factor = useCustomWeights ? (this.state.customWeights[opponent.id] || 0) : apiMatchup.total_games;
					effectiveWinrate += apiMatchup.win_rate * factor;
					totalGames += factor;
				}
			});

			effectiveWinrate = Math.round(effectiveWinrate / (totalGames / 100)) / 100;

			// Todo: optimize this to only call getPopularity once (see visibleArchetypes filtering)
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
				if (!useCustomWeights && (!maxPopularity || popularity.pct_of_total > maxPopularity)) {
					maxPopularity = popularity.pct_of_total;
				}
			}

			if (useCustomWeights && (!maxPopularity || this.state.customWeights[friendly.id] > maxPopularity)) {
				maxPopularity = this.state.customWeights[friendly.id];
			}
		});

		this.sortArchetypes(archetypeData);

		const sortedIds = archetypeData.map((archetype) => archetype.id);
		archetypeData.forEach((archetype) => {
			archetype.matchups = sortedIds.map((id) => archetype.matchups.find((m) => m.opponentId === id));
		});

		const favorites = this.state.favorites.filter((id) => archetypeIds.indexOf(id) !== -1);
		const ignored = this.state.ignoredColumns.filter((id) => archetypeIds.indexOf(id) !== -1);

		return (
			<ArchetypeMatrix
				archetypes={archetypeData}
				allArchetypes={archetypes}
				cardData={this.props.cardData}
				customWeights={this.state.customWeights}
				onCustomWeightsChanged={(archetypeId: number, popularity: number) => {
					this.onCustomPopularitiesChanged(archetypeId, popularity, archetypeIds);
				}}
				useCustomWeights={this.state.useCustomWeights}
				onUseCustomWeightsChanged={(useCustomWeights: boolean) => this.setState({useCustomWeights})}
				favorites={favorites}
				ignoredColumns={ignored}
				onFavoriteChanged={
					(archetypeId: number, favorite: boolean) => this.onFavoriteChanged(archetypeId, favorite, archetypeIds)
				}
				onIgnoreChanged={
					(archetypeId: number, ignore: boolean) => this.onIgnoreChanged(archetypeId, ignore, archetypeIds)
				}
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
				if (this.state.useCustomWeights) {
					return (this.state.customWeights[a.id] || 0) - (this.state.customWeights[b.id] || 0);
				}
				return a.popularityTotal - b.popularityTotal;
			}
			if (this.props.sortBy === "winrate") {
				return a.effectiveWinrate - b.effectiveWinrate;
			}
			if (a.playerClass === b.playerClass) {
				return 0;
			}
			return a.playerClass > b.playerClass ? 1 : -1;
		};

		archetypes.sort((a: ArchetypeData, b: ArchetypeData) => {
			const favorite = +this.isFavorite(b.id) - +this.isFavorite(a.id);
			return favorite || (compare(a, b) * direction) || (a.name > b.name ? 1 : -1);
		});
	}

	isFavorite(archetypeId: number): boolean {
		return this.state.favorites.indexOf(archetypeId) !== -1;
	}

	onCustomPopularitiesChanged(archetypeId: number, popularity: number, allArchetypes: number[]) {
		const customWeights = Object.assign({}, this.state.customWeights);
		Object.keys(customWeights).forEach((id) => {
			if (allArchetypes.indexOf(+id) === -1) {
				delete customWeights[id];
			}
		});
		customWeights["" + archetypeId] = popularity;
		this.setState({customWeights});
		UserData.setSetting("archetype-custom-popularities", customWeights);
	}

	onFavoriteChanged(archetypeId: number, favorite: boolean, allArchetypes: number[]) {
		let favorites = this.state.favorites.slice();
		favorites = favorites.filter((id) => allArchetypes.indexOf(id) !== -1);
		favorites = favorites.filter((id) => id !== archetypeId);
		if (favorite) {
			favorites.push(archetypeId);
		}
		this.setState({favorites});
		UserData.setSetting("archetype-favorites", favorites);
	}

	onIgnoreChanged(archetypeId: number, ignore: boolean, allArchetypes: number[]) {
		let ignoredColumns = this.state.ignoredColumns.slice();
		ignoredColumns = ignoredColumns.filter((id) => allArchetypes.indexOf(id) !== -1);
		ignoredColumns = ignoredColumns.filter((id) => id !== archetypeId);
		if (ignore) {
			ignoredColumns.push(archetypeId);
		}
		this.setState({ignoredColumns});
		UserData.setSetting("archetype-ignored", ignoredColumns);
	}

	getAllArchetypes(): {archetypeIds: number[], archetypes: ApiArchetype[]} {
		const archetypeIds = [];
		const matchupData = this.props.matchupData.series.data;
		Object.keys(matchupData).forEach((friendlyId: string) => {
			if (archetypeIds.indexOf(+friendlyId) === -1) {
				archetypeIds.push(+friendlyId);
			}
			Object.keys(matchupData[friendlyId]).forEach((opponentId: string) => {
				if (archetypeIds.indexOf(+opponentId) === -1) {
					archetypeIds.push(+opponentId);
				}
			});
		});
		return {
			archetypeIds,
			archetypes: archetypeIds.map((id) => this.getApiArchetype(id)).filter((x) => x !== undefined),
		};
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
		const matchupData = this.props.matchupData.series.data["" + friendly.id];
		return matchupData && matchupData["" + opponent.id];
	}

	getPopularity(archetype: ApiArchetype): ApiArchetypePopularity {
		return this.props.popularityData.series.data[archetype.player_class].find((a) => {
			return a.archetype_id === archetype.id;
		});
	}

}
