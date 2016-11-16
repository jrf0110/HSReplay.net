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

interface ArchetypeClientProps extends React.ClassAttributes<ArchetypeClient> {
}

interface ArchetypeClientState {
	popularities?: any;
	winrates?: any;
	sampleSize?: number;
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
}

export default class ArchetypeClient extends React.Component<ArchetypeClientProps, ArchetypeClientState> {

	private nonce?: number;

	constructor(props: ArchetypeClientProps, context: any) {
		super(props, context);
		this.state = {
			popularities: {},
			winrates: {},
			sampleSize: 0,
			smallestRank: 0,
			largestRank: 25,
			colorScheme: Colors.HSREPLAY,
			intensity: 25,
			fetching: true,
			archetypes: [],
			selectedArchetype: null,
			visibleNonce: 0,
			lookback: 7,
			offset: 0,
		};
		this.nonce = 0;
		this.fetch();
		fetch("/cards/canonicals/", {
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
								<DateRangeSelector
									lookback={this.state.lookback}
									onChangeLookback={(lookback: number): void => {
										this.setState({lookback: lookback});
									}}
									offset={this.state.offset}
									onChangeOffset={(offset: number): void => {
										this.setState({offset: offset});
									}}
								/>
								<SampleSizeSelector
									sampleSize={this.state.sampleSize}
									onChangeSampleSize={(sampelSize: number): void => this.setState({sampleSize: sampelSize})}
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
					<h2 className="text-center">Popularities</h2>
					<Distribution
						distributions={this.state.popularities}
						title="Archetype"
						value="Popularity"
						select={this.state.selectedArchetype}
						onSelect={(k) => this.select(k)}
					/>
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
		const baseUrl = "/cards/winrates/";

		const params = [];
		params.push("lookback=" + this.state.lookback);
		params.push("offset=" + this.state.offset);
		params.push("game_types=" + BnetGameType.BGT_RANKED_STANDARD + "," + BnetGameType.BGT_CASUAL_STANDARD);
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
			this.setState({
				popularities: json.frequencies,
				winrates: json.win_rates,
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
