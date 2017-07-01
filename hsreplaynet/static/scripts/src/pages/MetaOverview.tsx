
import PremiumWrapper from "../components/PremiumWrapper";
import InfoboxFilter from "../components/InfoboxFilter";
import DataManager from "../DataManager";
import UserData from "../UserData";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import * as React from "react";
import CardData from "../CardData";
import { Colors } from "../Colors";
import Matrix, { Matchup, NumberRow } from "../components/stats/Matrix";
import { BnetGameType } from "../hearthstone";
import * as _ from "lodash";
import IntensitySelector from "../components/stats/controls/IntensitySelector";
import ColorSchemeSelector from "../components/stats/controls/ColorSchemeSelector";

export interface EvaluatedArchetype {
	[archetype: string]: number;
}

interface MetaOverviewState {
	popularities?: EvaluatedArchetype;
	winrates?: any;
	expected_winrates?: EvaluatedArchetype;
	sampleSize?: number;
	hasChangedSampleSize?: boolean;
	smallestRank?: number;
	largestRank?: number;
	colorScheme?: Colors;
	intensity?: number;
	fetching?: boolean;
	archetypes?: any[];
	selectedArchetype?: string;
	visibleNonce?: number;
	lookback?: number;
	offset?: number;
	max_games_per_archetype?: EvaluatedArchetype;
	games_per_archetype?: EvaluatedArchetype;
}

interface MetaOverviewProps {
	cardData: CardData;
	gameType?: string;
	setGameType?: (gameType: string) => void;
	rankRange?: string;
	setRankRange?: (rankRange: string) => void;
	user: UserData;
	tab?: string;
	setTab?: (tab: string) => void;
}

export default class MetaOverview extends React.Component<MetaOverviewProps, MetaOverviewState> {
	private readonly dataManager: DataManager = new DataManager();

	private samplesPerDay: number;
	private nonce: number;

	constructor(props: MetaOverviewProps, context: any) {
		super(props, context);
		this.state = {
			popularities: {},
			winrates: {},
			expected_winrates: {},
			sampleSize: 100,
			hasChangedSampleSize: false,
			smallestRank: 0,
			largestRank: 20,
			colorScheme: Colors.HSREPLAY,
			intensity: 25,
			fetching: true,
			archetypes: [],
			selectedArchetype: null,
			visibleNonce: 0,
			lookback: 7,
			offset: 0,
			games_per_archetype: {},
			max_games_per_archetype: {},
		};
		this.nonce = 0;
		this.samplesPerDay = this.state.sampleSize / this.state.lookback;
		this.fetch();
		fetch("https://hsreplay.net/decks/canonical/json/", {
			credentials: "include",
		}).then((response) => {
			return response.json();
		}).then((json: any) => {
			this.setState({
				archetypes: json,
			});
		});
	}

	fetchArchetypeData() {
		this.dataManager.get("/api/v1/archetypes/").then((data) => {
			if (data && data.results) {
				const archetypeData = data.results.filter((x) => !x.name.startsWith("Basic")).sort((a, b) => {
					if (a.player_class === b.player_class) {
						return a.name > b.name ? 1 : -1;
					}
					return a.player_class - b.player_class;
				});
			}
		});
	}

	render(): JSX.Element {
		if (this.props.cardData) {
		}

		return <div className="archetype-detail-container">
			<aside className="infobox">
				<h1>Meta Overview</h1>
				<section id="rank-range-filter">
					<PremiumWrapper
						name="Deck List Rank Range"
						isPremium={this.props.user.isPremium()}
						infoHeader="Rank Range"
						infoContent="Ready to climb the ladder? Check out how decks perform at certain rank ranges!"
					>
						<h2>Rank range</h2>
						<InfoboxFilterGroup
							locked={!this.props.user.isPremium()}
							selectedValue={this.props.rankRange}
							onClick={(value) => this.props.setRankRange(value)}
							tabIndex={0} // TODO
						>
							<InfoboxFilter value="LEGEND_ONLY">Legend only</InfoboxFilter>
							<InfoboxFilter value="LEGEND_THROUGH_FIVE">Legend–5</InfoboxFilter>
							<InfoboxFilter value="LEGEND_THROUGH_TEN">Legend–10</InfoboxFilter>
							<InfoboxFilter value="ALL">Legend–25</InfoboxFilter>
						</InfoboxFilterGroup>
					</PremiumWrapper>
				</section>
				<section id="game-mode-filter">
					<h2>Game Mode</h2>
					<InfoboxFilterGroup
						selectedValue={this.props.gameType}
						onClick={(value) => this.props.setGameType(value)}
					>
						<InfoboxFilter value="RANKED_STANDARD">Ranked Standard</InfoboxFilter>
						<InfoboxFilter value="RANKED_WILD">Ranked Wild</InfoboxFilter>
					</InfoboxFilterGroup>
				</section>
			</aside>
			<main>
							<div className="row">
				<div className="col-lg-9 col-md-12">
					<div className="row">
						<div className="col-lg-10 col-md-10 col-xs-12">
							<h2 className="text-center">Matchups</h2>
							<Matrix
								matrix={this.state.winrates}
								sampleSize={this.state.sampleSize}
								colorScheme={this.state.colorScheme}
								intensity={this.state.intensity}
								working={this.state.fetching}
								select={this.state.selectedArchetype}
								onSelect={(k) => this.select(k)}
								popularities={this.state.popularities}
							/>
							<ColorSchemeSelector
								colorScheme={this.state.colorScheme}
								onChangeColorScheme={(colorScheme: Colors): void => this.setState({colorScheme})}
							/>
							<IntensitySelector
								intensity={this.state.intensity}
								onChangeIntensity={(intensity: number): void => this.setState({intensity})}
							/>
						</div>
					</div>
				</div>
				<div className="col-lg-3 col-sm-12">
					<h2 className="text-center">{this.state.selectedArchetype ? this.state.selectedArchetype : "Archetype"}</h2>
					{this.renderDecklist()}
				</div>
			</div>
			</main>
		</div>;
	}

	public componentDidUpdate(prevProps: MetaOverviewProps, prevState: MetaOverviewState, prevContext: any): void {
		if (prevState.smallestRank !== this.state.smallestRank || prevState.largestRank !== this.state.largestRank) {
			this.fetch();
		}
		if (prevState.lookback !== this.state.lookback || prevState.offset !== this.state.offset) {
			this.fetch();
		}
	}

	private renderDecklist(): JSX.Element {
		const key = this.state.selectedArchetype;

		if (!key) {
			return <p className="text-center">Select an Archetype…</p>;
		}
		if (!this.props.cardData) {
			return <p className="text-center">Loading cards…</p>;
		}

		const archetype = this.state.archetypes.find((archetype: any) => archetype.name === key);

		if (!archetype || !archetype.representative_deck) {
			return <div className="alert alert-error" role="alert">Missing Archetype data</div>;
		}

		let winrate = this.state.expected_winrates && this.state.expected_winrates[key] ? (this.state.expected_winrates[key] * 100).toFixed(2) : null;
		let popularity = this.state.popularities && this.state.popularities[key] ? (this.state.popularities[key] * 100).toFixed(1) : null;

		if (popularity && this.state.popularities[key] < 0.001) {
			popularity = "<0.1";
		}

		return <div className="text-center">
			<h3 className="text-center">Details</h3>
			<ul className="list-group text-left">
				<li className="list-group-item">
					<span className="badge badge-blue">{+this.state.games_per_archetype[key]}</span>
					Games
				</li>
				<li className="list-group-item">
					<span className="badge badge-blue">{popularity ? popularity + "%" : "unknown"}</span>
					Popularity
				</li>
				<li className="list-group-item">
					<span className="badge badge-blue">{winrate ? winrate + "%" : "unknown"}</span>
					Expected Winrate
				</li>
			</ul>
			<h3 className="text-center">Decklist</h3>
			{/*<CardList
				cardDb={this.props.cardData}
				cards={archetype.representative_deck.card_ids}
				name={archetype.name}
				class=""
			/>*/}
		</div>;
	}

	private select(key: string): void {
		// search for digest
		let digest = null;
		for (let i = 0; i < this.state.archetypes.length; i++) {
			const archetype = this.state.archetypes[i];
			if (archetype.name === key) {
				const deck = archetype.representative_deck;
				digest = deck.digest;
			}
		}
		if (digest && history && typeof history.pushState === "function") {
			history.pushState({}, document.title, "?deck_digest=" + digest);
		}
		this.setState({
			selectedArchetype: key,
		});
	}

	private buildQueryUrl(): string {
		const baseUrl = "https://hsreplay.net/cards/winrates/";

		const gametypes = [BnetGameType.BGT_RANKED_STANDARD];

		const params = [];
		params.push("lookback=" + this.state.lookback);
		params.push("offset=" + this.state.offset);
		params.push("game_types=" + gametypes.join(","));
		params.push("min_rank=" + this.state.smallestRank);
		params.push("max_rank=" + this.state.largestRank);

		return baseUrl + "?" + params.join("&");
	}

	private fetch(): void {
		const nonce = ++this.nonce;
		const REASON_NONCE_OUTDATED = "Nonce outdated";

		this.setState({
			fetching: true,
		});

		fetch(
			this.buildQueryUrl(),
			{
				credentials: "include",
			},
		).then((response) => {
			if (nonce < this.state.visibleNonce) {
				return Promise.reject(REASON_NONCE_OUTDATED);
			}
			return response.json();
		}).then((json: any) => {

			const winrates = json.win_rates || {};

			let games = {};
			let max = {};
			_.forEach(winrates, (row: NumberRow, archetype: string): void => {
				if (typeof games[archetype] === "undefined") {
					games[archetype] = 0;
					max[archetype] = 0;
				}
				_.forEach(row, (matchup: Matchup): void => {
					games[archetype] = matchup.match_count + games[archetype];
					max[archetype] = Math.max(matchup.match_count, games[archetype]);
				});
			});

			this.setState({
				popularities: json.frequencies || {},
				winrates,
				expected_winrates: json.expected_winrates || {},
				games_per_archetype: games,
				max_games_per_archetype: max,
				fetching: this.nonce === nonce ? false : true,
				visibleNonce: nonce,
			});
		}).catch((reason: any) => {
			if (reason === REASON_NONCE_OUTDATED) {
				return; // noop
			}
			return Promise.reject(reason);
		});
	}
}
