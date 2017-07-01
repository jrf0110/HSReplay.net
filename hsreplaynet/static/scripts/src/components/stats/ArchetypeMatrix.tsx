import * as React from "react";
import Matrix, { NumberMatrix } from "./Matrix";
import ColorSchemeSelector from "./controls/ColorSchemeSelector";
import IntensitySelector from "./controls/IntensitySelector";
import { Colors } from "../../Colors";

interface ArchetypeMatrixState {
	colorScheme?: Colors;
	intensity?: number;
	selectedArchetype?: string;
}

interface ArchetypeMatrixProps extends React.ClassAttributes<ArchetypeMatrix> {
	data?: any;
}

export default class ArchetypeMatrix extends React.Component<ArchetypeMatrixProps, ArchetypeMatrixState> {
	constructor(props: ArchetypeMatrixProps, state: ArchetypeMatrixState) {
		super(props, state);
		this.state = {
			colorScheme: Colors.HSREPLAY,
			intensity: 25,
		};
	}

	render(): JSX.Element {
		if (!this.props.data) {
			return <h3 className="message-wrapper">Loading...</h3>;
		}

		const matrix: NumberMatrix = {};
		const popularities = {};
		const archetypes = [];

		const playerClassMatchups = this.props.data.series.data;
		Object.keys(playerClassMatchups).forEach((playerClass) => {
			playerClassMatchups[playerClass].forEach((matchup) => {
				if (archetypes.indexOf(matchup.friendly_archetype) === -1) {
					archetypes.push(matchup.friendly_archetype);
				}
				if (archetypes.indexOf(matchup.opponent_archetype) === -1) {
					archetypes.push(matchup.opponent_archetype);
				}
			});
		});

		archetypes.sort();

		archetypes.forEach((friendly) => {
			matrix[friendly] = {};
			popularities[friendly] = {};
			archetypes.forEach((opponent) => {
				matrix[friendly][opponent] = {
					f_wr_vs_o: 0,
					friendly_wins: 0,
					is_mirror: friendly === opponent,
					match_count: 0,
				};

			});
		});

		Object.keys(playerClassMatchups).forEach((playerClass) => {
			playerClassMatchups[playerClass].forEach((matchup) => {
				matrix[matchup.friendly_archetype][matchup.opponent_archetype] = {
					f_wr_vs_o: matchup.win_rate / 100,
					friendly_wins: Math.floor(matchup.win_rate / 100 * matchup.total_games),
					is_mirror: matchup.friendly_archetype === matchup.opponent_archetype,
					match_count: matchup.total_games,
				};
			});
		});

		return (
			<div>
				<Matrix
					matrix={matrix}
					sampleSize={100}
					colorScheme={this.state.colorScheme}
					intensity={this.state.intensity}
					working={false}
					select={this.state.selectedArchetype}
					onSelect={(k) => this.select(k)}
					popularities={popularities}
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
		);
	}

	private select(key: string): void {
		// TODO
		// search for digest
		// let digest = null;
		// for (let i = 0; i < this.state.archetypes.length; i++) {
		// 	const archetype = this.state.archetypes[i];
		// 	if (archetype.name === key) {
		// 		const deck = archetype.representative_deck;
		// 		digest = deck.digest;
		// 	}
		// }
		// this.setState({
		// 	selectedArchetype: key,
		// });
	}
}
