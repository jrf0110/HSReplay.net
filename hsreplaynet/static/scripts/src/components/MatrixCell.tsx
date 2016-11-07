import * as React from "react";
import {Colors} from "../Colors";

interface MatrixCellProps extends React.ClassAttributes<MatrixCell> {
	winrate: number,
	mirror: boolean;
	intensity: number,
	colors: Colors,
	title?: string;
	x: number;
	y: number;
	edge: number;
	disable?: boolean;
	onClick: () => void;
}

interface MatrixCellState {
}

export default class MatrixCell extends React.Component<MatrixCellProps, MatrixCellState> {

	public render(): JSX.Element {
		const cellColor = this.getColorString(this.props.winrate, this.props.mirror);
		const style = {
			fill: cellColor,
		};

		return <g
			onClick={(e) => {
				if(this.props.onClick) {
					this.props.onClick();
				}
				e.preventDefault();
			}}
			onMouseDown={(e) => {
				e.preventDefault();
			}}
		>
			<rect
				x={this.props.x}
				y={this.props.y}
				width={this.props.edge}
				height={this.props.edge}
				style={style}/>
			<title>{this.props.title.replace("\n", String.fromCharCode(10))}</title>
		</g>;
	}

	public shouldComponentUpdate(nextProps: MatrixCellProps, nextState: MatrixCellState, nextContext: any): boolean {
		return (
			this.props.winrate !== nextProps.winrate ||
			this.props.mirror !== nextProps.mirror ||
			this.props.intensity !== nextProps.intensity ||
			this.props.colors !== nextProps.colors ||
			this.props.title !== nextProps.title ||
			this.props.x !== nextProps.x ||
			this.props.y !== nextProps.y ||
			this.props.edge !== nextProps.edge ||
			this.props.disable !== nextProps.disable
		);
	}

	private getColorString(winrate: number, mirror: boolean): string {
		if (mirror) {
			return "black";
		}

		if (winrate === null) {
			return "#ddd";
		}

		let neutral = [0, 100, 100];
		let positive = [0, 0, 0];
		let negative = [0, 0, 0];

		switch (this.props.colors) {
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

		if(this.props.disable) {
			positive[1] = 0;
			neutral[1] = 0;
			negative[1] = 0;
		}

		const _fn = (x: number, from: number, to: number): number => {
			if (from === null || to === null) {
				return +(to || from);
			}
			x = Math.pow(x, this.props.intensity);
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
