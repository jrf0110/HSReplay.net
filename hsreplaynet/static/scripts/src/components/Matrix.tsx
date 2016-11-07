import * as React from "react";
import $ from "jquery";

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
}

const enum Colors {
	REDGREEN,
	REDGREEN2,
	ORANGEBLUE,
	HSREPLAY,
}

export default class Matrix extends React.Component<MatrixProps, MatrixState> {

	constructor(props: MatrixProps, context: any) {
		super(props, context);

		this.state = {
			intensity: 0.25,
			colors: Colors.REDGREEN,
		};
	}

	public render(): JSX.Element {
		let rowcount = 0;
		const archetypes = Object.keys(this.props.matrix);
		const rows = $.map(archetypes, (key: string) => {
			const class1 = key;
			const row: NumberRow = this.props.matrix[key];
			let cellcount = 0;
			const cells = $.map(archetypes, (key: string) => {
				const class2 = key;
				const matchup: any = row[key];
				const cellColor = this.getColorString(matchup.f_wr_vs_o, !!matchup.is_mirror);
				const style = {
					backgroundColor: cellColor,
					borderColor: cellColor,
				};
				let tooltip = class1 + " vs. " + class2;
				if (matchup.is_mirror) {
					tooltip += "\nMirror matchup (" + matchup.match_count + " games)";
				}
				else {
					if (matchup.match_count > 0) {
						let winrate = (matchup.f_wr_vs_o * 100).toFixed(2) + "%";
						winrate += " (won " + matchup.friendly_wins + "/" + matchup.match_count + ")";
						tooltip += "\nWinrate: " + winrate;
					}
					else {
						tooltip += "\nNot enough games";
					}
				}
				return <td key={cellcount++}
						   title={tooltip.replace("\n",  String.fromCharCode(10))}
						   style={style}></td>;
			});
			return (
				<tr key={rowcount++}>
					<th>{key}</th>
					{cells}
				</tr>
			);
		});

		const headers = [<th></th>].concat($.map(archetypes, (key: string) => {
			return <th className="vertical-text">{key}</th>;
		}));

		return (
			<div className="component-matrix">
				<table style={{fontSize: "0.7em"}}>
					<tr>{headers}</tr>
					{rows}
				</table>
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
		);
	}

	private getColorString(winrate: number, mirror: boolean): string {
		if (mirror) {
			return "black";
		}

		if (winrate === null) {
			return "gray";
		}

		let neutral = [0, 100, 100];
		let positive = [0, 0, 0];
		let negative = [0, 0, 0];

		switch (this.state.colors) {
			case Colors.REDGREEN:
				positive = [120, 60, 50];
				neutral = [60, 100, 100];
				negative = [0, 100, 65.7];
				break;
			case Colors.REDGREEN2:
				positive = [120, 60, 50];
				neutral = [null, 100, 100];
				negative = [0, 100, 65.7];
				break;
			case Colors.ORANGEBLUE:
				positive = [202, 100, 50];
				neutral = [null, 100, 100];
				negative = [41, 100, 50];
				break;
			case Colors.HSREPLAY:
				positive = [214, 66, 34];
				neutral = [null, 100, 100];
				negative = [351, 51, 51];
				break;
		}

		const _fn = (x: number, from: number, to: number): number => {
			if (from === null || to === null) {
				return +(to || from);
			}
			x = Math.pow(x, this.state.intensity);
			return from + (to - from) * x;
		};

		const fn = (x: number, from: number[], to: number[]): number[] => {
			return [
				_fn(x, from[0], to[0]),
				_fn(x, from[1], to[1]),
				_fn(x, from[2], to[2]),
			];
		};

		const hsl = (hsl: number[]): string => {
			return "hsl(" + hsl[0] + ", " + hsl[1] + "%, " + hsl[2] + "%)";
		};

		const severity = Math.abs(0.5 - winrate) * 2;

		if (winrate > 0.5) {
			return hsl(fn(severity, neutral, positive));
		}
		else if (winrate < 0.5) {
			return hsl(fn(severity, neutral, negative));
		}
		else {
			return hsl(neutral);
		}
	}
}
