import * as React from "react";
import Distribution from "./Distribution";
import {BnetGameType} from "../hearthstone";
import Matrix from "./stats/Matrix";
import SampleSizeSelector from "./stats/controls/SampleSizeSelector";
import RankRangeSelector from "./stats/controls/RankRangeSelector";
import {Colors} from "../Colors";
import ColorSchemeSelector from "./stats/controls/ColorSchemeSelector";
import IntensitySelector from "./stats/controls/IntensitySelector";
import DateRangeSelector from "./stats/controls/DateRangeSelector";
import {NumberRow} from "./stats/Matrix";
import {Matchup} from "./stats/Matrix";
import CardList from "./CardList";

interface ArchetypeClientProps extends React.ClassAttributes<ArchetypeClient> {
	cardData: Map<string, any>;
}

export interface EvaluatedArchetype {
	[archetype: string]: number;
}

interface ArchetypeClientState {
	popularities?: EvaluatedArchetype;
	winrates?: any;
	expected_winrates?: EvaluatedArchetype
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

export default class ArchetypeClient extends React.Component<ArchetypeClientProps, ArchetypeClientState> {

	private samplesPerDay: number;
	private nonce: number;

	constructor(props: ArchetypeClientProps, context: any) {
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

	public render(): JSX.Element {
		return <div>
			<div className="row">
				<div className="col-lg-9 col-md-12">
					<div className="row">
						<div className="col-lg-2 col-md-2 col-sm-12">
							<h2 className="text-center">&nbsp;</h2>
							<div>
								<RankRangeSelector
									smallest={this.state.smallestRank}
									onChangeSmallest={(smallestRank: number): void => {
										this.setState({smallestRank: smallestRank});
									}}
									largest={this.state.largestRank}
									onChangeLargest={(largestRank: number): void => {
										this.setState({largestRank: largestRank});
									}}
								/>
								<hr />
								<DateRangeSelector
									lookback={this.state.lookback}
									onChangeLookback={(lookback: number): void => {
										let changes: ArchetypeClientState = {lookback: lookback};
										if (!this.state.hasChangedSampleSize) {
											changes.sampleSize = Math.round(this.samplesPerDay * lookback);
										}
										this.setState(changes);
									}}
									offset={this.state.offset}
									onChangeOffset={(offset: number): void => {
										this.setState({offset: offset});
									}}
								/>
								<hr />
								<SampleSizeSelector
									sampleSize={this.state.sampleSize}
									onChangeSampleSize={(sampelSize: number): void => this.setState({sampleSize: sampelSize, hasChangedSampleSize: true})}
								/>
							</div>
						</div>
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
								onChangeColorScheme={(colorScheme: Colors): void => this.setState({colorScheme: colorScheme})}
							/>
							<IntensitySelector
								intensity={this.state.intensity}
								onChangeIntensity={(intensity: number): void => this.setState({intensity: intensity})}
							/>
						</div>
					</div>
				</div>
				<div className="col-lg-3 col-sm-12">
					<h2 className="text-center">{this.state.selectedArchetype ? this.state.selectedArchetype : "Archetype"}</h2>
					{this.renderDecklist()}
				</div>
			</div>
		</div>;
	}

	public componentDidUpdate(prevProps: ArchetypeClientProps, prevState: ArchetypeClientState, prevContext: any): void {
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
		if (!this.props.cardData || !this.props.cardData.size) {
			return <p className="text-center">Loading cards…</p>;
		}

		const archetype = this.state.archetypes.find((archetype: any) => archetype.name === key);

		if (!archetype || !archetype.representative_deck) {
			return <div className="alert alert-error" role="alert">Missing Archetype data</div>;
		}

		let winrate = this.state.expected_winrates && this.state.expected_winrates[key] ? (this.state.expected_winrates[key] * 100).toFixed(2) : null;
		let popularity = this.state.popularities && this.state.popularities[key] ? (this.state.popularities[key] * 100).toFixed(1) : null;

		if(popularity && this.state.popularities[key] < 0.001) {
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
			<CardList
				cardDb={this.props.cardData}
				cards={archetype.representative_deck.card_ids}
				name={archetype.name}
				class=""
			/>
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
			}
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
				winrates: winrates,
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
