import * as React from "react";
import $ from "jquery";
import {Colors} from "../Colors";
import MatrixCell from "./MatrixCell";

interface MatrixProps extends React.ClassAttributes<Matrix> {
	matrix: NumberMatrix;
}

interface NumberMatrix {
	[key: string]: NumberRow;
}

interface NumberRow {
	[key: string]: number;
}

interface MatrixState {
	intensity?: number;
	colors?: Colors;
	cutoff?: number;
	highlight?: string[];
}

export default class Matrix extends React.Component<MatrixProps, MatrixState> {

	constructor(props: MatrixProps, context: any) {
		super(props, context);

		this.state = {
			intensity: 0.25,
			colors: Colors.REDGREEN,
			cutoff: 0,
			highlight: [],
		};
	}

	public render(): JSX.Element {
		const archetypes = Object.keys(this.props.matrix);
		let cells = [];
		let titles = [];
		let rowcount = 0;
		let cellcount = 0;
		const offsetx = 150;
		const offsety = 150;
		const mult = 30;
		const width = archetypes.length;

		let games = [];

		// count pass
		$.each(archetypes, (index: number, outer: string) => {

			if(!games[outer]) {
				games[outer] = 0;
			}

			const row: NumberRow = this.props.matrix[outer];
			$.each(archetypes, (index: number, inner: string) => {

				if(!games[inner]) {
					games[inner] = 0;
				}

				const matchup: any = row[inner];
				const matches = matchup.match_count;
				const is_cutoff = matchup.match_count < this.state.cutoff;
				if(!is_cutoff) {
					games[outer] += matches;
					games[inner] += matches;
				}
			});
		});

		// render pass
		$.each(archetypes, (index: number, key: string) => {
			cellcount = 0;
			const class1 = key;
			const row: NumberRow = this.props.matrix[key];
			cells.push(<g key={rowcount}>{$.map(archetypes, (key: string) => {
				const class2 = key;
				const matchup: any = row[key];
				const is_cutoff = matchup.match_count < this.state.cutoff;
				let tooltip = class1 + " vs. " + class2;
				if (matchup.is_mirror) {
					tooltip += "\nMirror matchup (" + matchup.match_count + " games)";
				}
				else {
					if (is_cutoff || !matchup.match_count) {
						if(this.state.cutoff > 0) {
							tooltip += "\nNot enough games";
							tooltip += " (" + matchup.match_count + " of " + this.state.cutoff +")";
						}
						else {
							tooltip += "\nNo game";
						}
					}
					else {
						let winrate = (matchup.f_wr_vs_o * 100).toFixed(2) + "%";
						winrate += " (won " + matchup.friendly_wins + "/" + matchup.match_count + ")";
						tooltip += "\nWinrate: " + winrate;
					}
				}

				return <MatrixCell
					key={rowcount * length + cellcount}
					winrate={is_cutoff ? null : matchup.f_wr_vs_o}
					mirror={matchup.is_mirror}
					intensity={this.state.intensity}
					colors={this.state.colors}
					title={tooltip}
					x={offsetx + cellcount++ * mult}
					y={offsety + rowcount * mult}
					edge={mult}
					onHoverStart={() => {
						this.setState({
							highlight: [class1, class2],
						});
					}}
					onHoverEnd={() => {
						this.setState({
							highlight: [],
						});
					}}
				/>;
			})}</g>);

			let classNames = [];

			if(!games[key]) {
				classNames.push("boring");
			}

			let hClassNames = classNames.slice();
			let vClassNames = classNames.slice();

			if(this.state.highlight.indexOf(key) === 0) {
				hClassNames.push("interesting");
			}

			if(this.state.highlight.lastIndexOf(key) === 1) {
				vClassNames.push("interesting");
			}

			titles.push(<text
				key={"h" + rowcount}
				x={offsetx + -mult / 4}
				y={offsety + rowcount * mult}
				textAnchor="end"
				dominantBaseline={"middle"}
				transform={"translate(0 " + mult / 2 + ")"}
				className={hClassNames.join(" ")}
			>{class1}</text>);

			titles.push(<text
				key={"v" + rowcount}
				x={rowcount * mult + offsetx}
				y={offsety}
				textAnchor="start"
				dominantBaseline={"middle"}
				transform={"translate(" + (-1.7 * mult) + " " + (offsety - mult / 3)+ ") rotate(315" +
				 " " + rowcount * mult +" 0)"}
				className={vClassNames.join(" ")}
			>{class1}</text>);

			rowcount++;
		});

		return (
			<div className="component-matrix">
				<svg viewBox={"0 0 " + (rowcount * mult + offsetx + 50) + " " + (cellcount * mult + offsety)}>
					<g>{titles}</g>
					<g className="cells">{cells}</g>
				</svg>
				<div>
					<div>
						<label>
							Cutoff
							<input type="number"
								   min={0}
								   value={"" + this.state.cutoff}
								   onChange={(e: any) => {
										this.setState({
											cutoff: +e.target.value,
										});
							}}/>
						</label>
					</div>
					<div>
						<label>
							Intensity
							<input type="range" min={0} max={100}
								   value={"" + this.state.intensity * 100}
								   onChange={(e: any) => {
								this.setState({
									intensity: +e.target.value / 100,
								});
							}}/>
						</label>
						<label>
							Colors
							<select value={"" + this.state.colors} onChange={(e: any) => {
								this.setState({
									colors: +e.target.value,
								});
							}}>
								<option value={"" + Colors.REDGREEN}>Red/Green</option>
								<option value={"" + Colors.REDGREEN2}>Alternate Red/Green</option>
								<option value={"" + Colors.ORANGEBLUE}>Orange/Blue</option>
								<option value={"" + Colors.HSREPLAY}>HSReplay</option>
							</select>
						</label>
					</div>
				</div>
			</div>
		);
	}

}
