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
	apiArchetypes?: ApiArchetype[];
	archetypeData?: ArchetypeData[];
	currentSort?: number[];
	customWeights?: any;
	favorites?: number[];
	ignoredColumns?: number[];
	maxPopularity?: number;
	sortedIds?: number[];
	useCustomWeights?: boolean;
}

const popularityCutoff = 1;

export default class ArchetypeHeadToHead extends React.Component<ArchetypeHeadToHeadProps, ArchetypeHeadToHeadState> {
	constructor(props: ArchetypeHeadToHeadProps, state: ArchetypeHeadToHeadState) {
		super();
		this.state = {
			apiArchetypes: [],
			archetypeData: [],
			currentSort: [],
			customWeights: UserData.getSetting("archetype-custom-popularities") || {},
			favorites: UserData.getSetting("archetype-favorites") || [],
			ignoredColumns: UserData.getSetting("archetype-ignored") || [],
			maxPopularity: 0,
			sortedIds: [],
			useCustomWeights: false,
		};
	}

	componentDidMount() {
		if (this.props.sortBy === "none") {
			// switch to default sorting of page is loaded with "sortBy=none"
			this.props.setSortBy("popularity");
		}
	}

	componentWillReceiveProps(nextProps: ArchetypeHeadToHeadProps) {
		if (!nextProps.matchupData || !nextProps.popularityData || !nextProps.archetypeData) {
			return;
		}
		this.updateData(nextProps);
	}

	render() {
		if (!this.state.archetypeData.length) {
			return null;
		}

		return (
			<ArchetypeMatrix
				archetypes={this.state.archetypeData}
				allArchetypes={this.state.apiArchetypes}
				cardData={this.props.cardData}
				customWeights={this.state.customWeights}
				onCustomWeightsChanged={(archetypeId: number, popularity: number) => {
					this.onCustomPopularitiesChanged(archetypeId, popularity);
				}}
				useCustomWeights={this.state.useCustomWeights}
				onUseCustomWeightsChanged={(useCustomWeights: boolean) => {
					this.setState({useCustomWeights}, () => this.props.setSortBy("none"));
				}}
				favorites={this.state.favorites.filter((id) => this.state.sortedIds.indexOf(id) !== -1)}
				ignoredColumns={this.state.ignoredColumns.filter((id) => this.state.sortedIds.indexOf(id) !== -1)}
				onFavoriteChanged={
					(archetypeId: number, favorite: boolean) => this.onFavoriteChanged(archetypeId, favorite)
				}
				onIgnoreChanged={
					(archetypeId: number, ignore: boolean) => this.onIgnoreChanged(archetypeId, ignore)
				}
				maxPopularity={this.state.maxPopularity}
				sortBy={this.props.sortBy}
				sortDirection={this.props.sortDirection}
				onSortChanged={(sortBy: string, sortDirection: SortDirection) => {
					this.props.setSortDirection(sortDirection);
					this.props.setSortBy(sortBy);
				}}
			/>
		);
	}

	updateData(props: ArchetypeHeadToHeadProps) {
		let archetypeData: ArchetypeData[] = [];
		const {archetypeIds, apiArchetypes} = this.getAllArchetypes(props.matchupData, props.archetypeData);

		let maxPopularity = null;
		const useCustomWeights = this.state.useCustomWeights;

		const visibleArchetypes = apiArchetypes.filter((archetype) => {
			const popularity = this.getPopularity(archetype, props.popularityData);
			if (popularity) {
				return popularity.pct_of_total >= popularityCutoff || this.isFavorite(archetype.id);
			}
			return false;
		});

		visibleArchetypes.forEach((friendly: ApiArchetype) => {
			const matchups: MatchupData[] = [];
			let effectiveWinrate = 0;
			let totalGames = 0;

			visibleArchetypes.forEach((opponent: ApiArchetype) => {
				const apiMatchup = this.getMatchup(friendly, opponent, props.matchupData);
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
			const popularity = this.getPopularity(friendly, props.popularityData);
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

		let sortedIds = this.state.sortedIds;
		if (props.sortBy === "none") {
			archetypeData = this.state.sortedIds.map((id) => archetypeData.find((a) => a.id === id));
		}
		else {
			this.sortArchetypes(archetypeData, props.sortDirection, props.sortBy);
			sortedIds = archetypeData.map((archetype) => archetype.id);
		}

		archetypeData.forEach((archetype) => {
			archetype.matchups = sortedIds.map((id) => archetype.matchups.find((m) => m.opponentId === id));
		});

		this.setState({
			apiArchetypes,
			archetypeData,
			maxPopularity,
			sortedIds,
		});
	}

	sortArchetypes(archetypes: ArchetypeData[], sortDirection: SortDirection, sortBy: string) {
		const direction = sortDirection === "ascending" ? 1 : -1;

		const compare = (a: ArchetypeData, b: ArchetypeData): number => {
			if (sortBy === "popularity") {
				if (this.state.useCustomWeights) {
					return (this.state.customWeights[a.id] || 0) - (this.state.customWeights[b.id] || 0);
				}
				return a.popularityTotal - b.popularityTotal;
			}
			if (sortBy === "winrate") {
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

	onCustomPopularitiesChanged(archetypeId: number, popularity: number) {
		const customWeights = Object.assign({}, this.state.customWeights);
		Object.keys(customWeights).forEach((id) => {
			if (this.state.archetypeData.every((a) => a.id !== +id)) {
				delete customWeights[id];
			}
		});
		customWeights["" + archetypeId] = popularity;
		UserData.setSetting("archetype-custom-popularities", customWeights);
		this.setState({customWeights}, () => {
			if (this.props.sortBy === "popularity" || this.props.sortBy === "winrate") {
				this.props.setSortBy("none");
			}
			else {
				this.updateData(this.props);
			}
		});
	}

	onFavoriteChanged(archetypeId: number, favorite: boolean) {
		let favorites = this.state.favorites.slice();
		favorites = favorites.filter((id) => this.state.archetypeData.some((a) => a.id === id));
		favorites = favorites.filter((id) => id !== archetypeId);
		if (favorite) {
			favorites.push(archetypeId);
		}
		const newState = {favorites};
		if (this.props.sortBy === "none") {
			// archetypes will not be re-sorted, we need to sort favorites manually
			const favs = [];
			const nonFavs = [];
			let sortedIds = this.state.sortedIds.slice();
			if (favorite && sortedIds.indexOf(archetypeId) === -1) {
				// new favorite that is below cutoff
				sortedIds.push(archetypeId);
			}
			else if (!favorite) {
				const archetype = this.state.archetypeData.find((a) => a.id === archetypeId);
				if (archetype.popularityTotal < popularityCutoff) {
					// favorite is below cutoff, so remove entirely
					sortedIds = sortedIds.filter((id) => id !== archetypeId);
				}
			}
			// split into favorites/non-favorites while keeping existing sorting
			sortedIds.forEach((id) => {
				if (favorites.indexOf(id) === -1) {
					nonFavs.push(id);
				}
				else {
					favs.push(id);
				}
			});
			newState["sortedIds"] = favs.concat(nonFavs);
		}
		this.setState(newState, () => this.updateData(this.props));
		UserData.setSetting("archetype-favorites", favorites);
	}

	onIgnoreChanged(archetypeId: number, ignore: boolean) {
		let ignoredColumns = this.state.ignoredColumns.slice();
		ignoredColumns = ignoredColumns.filter((id) => this.state.archetypeData.some((a) => a.id === id));
		ignoredColumns = ignoredColumns.filter((id) => id !== archetypeId);
		if (ignore) {
			ignoredColumns.push(archetypeId);
		}
		UserData.setSetting("archetype-ignored", ignoredColumns);
		this.setState({ignoredColumns}, () => {
			if (this.props.sortBy === "winrate") {
				this.props.setSortBy("none");
			}
			else {
				this.updateData(this.props);
			}
		});
	}

	getAllArchetypes(matchupData: any, archetypeData: any): {archetypeIds: number[], apiArchetypes: ApiArchetype[]} {
		const archetypeIds = [];
		Object.keys(matchupData.series.data).forEach((friendlyId: string) => {
			if (archetypeIds.indexOf(+friendlyId) === -1) {
				archetypeIds.push(+friendlyId);
			}
			Object.keys(matchupData.series.data[friendlyId]).forEach((opponentId: string) => {
				if (archetypeIds.indexOf(+opponentId) === -1) {
					archetypeIds.push(+opponentId);
				}
			});
		});
		return {
			archetypeIds,
			apiArchetypes: archetypeIds.map((id) => this.getApiArchetype(id, archetypeData)).filter((x) => x !== undefined),
		};
	}

	getApiArchetype(id: number, archetypeData: any): ApiArchetype {
		const archetype = archetypeData.results.find((a) => a.id === id);
		return archetype && {
			id: archetype.id,
			name: archetype.name,
			player_class: getPlayerClassFromId(archetype.player_class),
		};
	}

	getMatchup(friendly: ApiArchetype, opponent: ApiArchetype, matchupData: any): ApiArchetypeMatchupData {
		const matchups = matchupData.series.data["" + friendly.id];
		return matchups && matchups["" + opponent.id];
	}

	getPopularity(archetype: ApiArchetype, popularityData: any): ApiArchetypePopularity {
		return popularityData.series.data[archetype.player_class].find((a) => {
			return a.archetype_id === archetype.id;
		});
	}

}
