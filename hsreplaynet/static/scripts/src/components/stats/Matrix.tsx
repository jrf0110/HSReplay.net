import * as React from "react";
import $ from "jquery";
import {Colors} from "../../Colors";
import MatrixBody from "./MatrixBody";

interface MatrixProps extends React.ClassAttributes<Matrix> {
	matrix: NumberMatrix;
	sampleSize?: number;
	colorScheme?: Colors;
}

interface NumberMatrix {
	[key: string]: NumberRow;
}

interface NumberRow {
	[key: string]: Matchup;
}

interface Matchup {
	f_wr_vs_o: number|null;
	friendly_wins: number;
	is_mirror: boolean;
	match_count: number;
}

export interface Cell {
	ratio: number|null;
	mirror?: boolean;
	title?: string;
}

interface MatrixState {
	intensity?: number;
	mark?: string[];
	highlight?: number[];
	hideBoring?: boolean;
}

const mult = 30;

const cellOffsetX = 150;
const cellOffsetY = 150;

export default class Matrix extends React.Component<MatrixProps, MatrixState> {

	private ref: any;

	constructor(props: MatrixProps, context: any) {
		super(props, context);

		this.state = {
			intensity: 0.25,
			mark: [],
			highlight: [],
			hideBoring: true,
		};
	}

	public render(): JSX.Element {
		let titles = [];
		let selections = [];
		let rowcount = 0;
		let cellcount = 0;
		const width = this.archetypes.length * mult;

		let games = [];

		let archetypeList = [];

		// count pass
		$.each(this.archetypes, (index: number, outer: string) => {

			if (!games[outer]) {
				games[outer] = 0;
			}

			const row: NumberRow = this.props.matrix[outer];
			$.each(this.archetypes, (index: number, inner: string) => {

				if (!games[inner]) {
					games[inner] = 0;
				}

				const matchup: any = row[inner];
				const matches = matchup.match_count;
				const is_cutoff = matchup.match_count < this.props.sampleSize;
				if (!is_cutoff) {
					games[outer] += matches;
					games[inner] += matches;
				}
			});

			archetypeList.push(outer);
		});

		let index = 0;
		let cells = [];

		// render pass
		$.each(this.archetypes, (i: number, key: string) => {
			let classNames = [];
			const class1 = key;

			if (!games[key]) {
				classNames.push("boring");
			}

			let hClassNames = classNames.slice();
			let vClassNames = classNames.slice();

			if (this.state.highlight.indexOf(index) === 0) {
				vClassNames.push("interesting");
			}

			if (this.state.highlight.lastIndexOf(index) === 1) {
				hClassNames.push("interesting");
			}

			let row: NumberRow = this.props.matrix[key];
			let cellRow: Cell[] = [];
			$.each(row, (class2: string, matchup: Matchup) => {
				let title = class1 + " vs. " + class2;

				const valid = matchup.match_count >= this.props.sampleSize;
				const ratio = valid ? matchup.f_wr_vs_o : null;

				if (matchup.is_mirror) {
					title += "\nMirror matchup (" + matchup.match_count + " games)";
				}
				else {
					if (!valid && !matchup.match_count) {
						if (this.props.sampleSize > 0) {
							title += "\nNot enough games";
							title += " (" + matchup.match_count + " of " + this.props.sampleSize + ")";
						}
						else {
							title += "\nNo game";
						}
					}
					else {
						let winrate = (matchup.f_wr_vs_o * 100).toFixed(2) + "%";
						winrate += " (won " + matchup.friendly_wins + "/" + matchup.match_count + ")";
						title += "\nWinrate: " + winrate;
					}
				}
				cellRow.push({
					ratio: ratio,
					mirror: matchup.is_mirror,
					title: title,
				});
			});
			cells.push(cellRow);

			titles.push(<text
				key={"h" + rowcount}
				x={cellOffsetX + -mult / 4}
				y={cellOffsetY + rowcount * mult}
				textAnchor="end"
				dominantBaseline={"middle"}
				transform={"translate(0 " + mult / 2 + ")"}
				className={hClassNames.join(" ")}
			>{class1}</text>);

			titles.push(<text
				key={"v" + rowcount}
				x={rowcount * mult + cellOffsetX}
				y={cellOffsetY}
				textAnchor="start"
				dominantBaseline={"middle"}
				transform={"translate(" + (-1.7 * mult) + " " + (cellOffsetY - mult / 3)+ ") rotate(315" +
				 " " + rowcount * mult +" 0)"}
				className={vClassNames.join(" ")}
			>{class1}</text>);

			if (this.state.mark.indexOf(key) !== -1) {
				selections.push(<rect
					x={cellOffsetX}
					y={cellOffsetY + rowcount * mult}
					height={mult}
					width={width}
				/>);
			}

			index++;
			rowcount++;
		});

		const dimensions = this.getSVGDimensions();

		return (
			<div className="component-matrix">
				<svg
					viewBox={"0 0 " + dimensions[0] + " " + dimensions[1]}
					ref={(ref) => {
						this.ref = ref;
					}}
					onMouseMove={(e) => this.hover(e.clientX, e.clientY)}
					onTouchStart={(e) => this.touch(e)}
					onTouchMove={(e) => this.touch(e)}
					onMouseLeave={() => this.clearHover()}
					onTouchCancel={() => this.clearHover()}
					onTouchEnd={() => this.clearHover()}
				>
					<g>{titles}</g>
					<g className="cells"><MatrixBody
						cells={cells}
						colors={this.props.colorScheme}
						intensity={this.state.intensity}
						offsetX={cellOffsetX}
						offsetY={cellOffsetY}
						edge={mult}
					/></g>
					<g className="selections">{selections}</g>
				</svg>
				<div>
					<div>
						<label>
							Intensity
							<input type="range" min={0} max={100}
								   value={"" + (100 - this.state.intensity * 100)}
								   onChange={(e: any) => {
								this.setState({
									intensity: (100 - e.target.value) / 100,
								});
							}}/>
						</label>

					</div>
				</div>
			</div>
		);
	}

	public shouldComponentUpdate(nextProps: MatrixProps, nextState: MatrixState, nextContext: any): boolean {
		if (nextState.highlight.length !== this.state.highlight.length) {
			return true;
		}
		for (let i = 0; i < nextState.highlight.length; i++) {
			if (nextState.highlight[i] !== this.state.highlight[i]) {
				return true;
			}
		}
		return true;
	}

	private get archetypes(): string[] {
		return Object.keys(this.props.matrix);
	}

	private getSVGDimensions(): number[] {
		return [
			this.archetypes.length * mult + cellOffsetX + 50,
			this.archetypes.length * mult + cellOffsetY,
		];
	}

	private touch(e): void {
		if (!e.touches[0]) {
			return;
		}

		const touch = e.touches[0];

		if (this.hover(touch.clientX, touch.clientY)) {
			e.preventDefault();
		}
	}

	private hover(clientX: number, clientY: number): boolean {
		if (!this.ref) {
			return false;
		}

		const rect = this.ref.getBoundingClientRect();
		const dimensions = this.getSVGDimensions();

		const correctionX = dimensions[0] / rect.width;
		const correctionY = dimensions[1] / rect.height;

		const pxOffsetX = clientX - rect.left;
		const pxOffsetY = clientY - rect.top;

		const offsetX = pxOffsetX * correctionX - cellOffsetX;
		const offsetY = pxOffsetY * correctionY - cellOffsetY;

		const max = this.archetypes.length * mult;

		if (offsetX < 0 || offsetX > max || offsetY < 0 || offsetY > max) {
			this.clearHover();
			return false;
		}

		const cellX = Math.floor(offsetX / mult);
		const cellY = Math.floor(offsetY / mult);

		this.setState({
			highlight: [cellX, cellY],
		});

		return true;
	}

	private clearHover(): void {
		this.setState({
			highlight: [],
		})
	}

	private toggleRow(row: string): void {
		const index = this.state.mark.indexOf(row);
		if (index === -1) {
			this.setState({
				mark: this.state.mark.concat([row]),
			});
		}
		else {
			this.setState({
				mark: this.state.mark.filter((key) => {
					return key !== row;
				}),
			});
		}
	}
}
