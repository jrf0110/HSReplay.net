import * as React from "react";
import {Colors} from "../../Colors";
import MatrixCell from "./MatrixCell";
import * as _ from "lodash";
import {Cell} from "./Matrix";

interface MatrixBodyProps extends React.ClassAttributes<MatrixBody> {
	cells: Cell[][];
	colors: Colors;
	intensity: number;
	offsetX?: number;
	offsetY?: number;
	edge: number;
	onClick?: (x: number, y: number) => void;
	onHoverStart?: (x: number, y: number) => void;
	onHoverEnd?: (x: number, y: number) => void;
}

export default class MatrixBody extends React.Component<MatrixBodyProps, void> {

	public render(): JSX.Element {
		let body = [];

		const width = this.props.cells.length;
		for (let i = 0; i < width; i++) {
			const row = this.props.cells[i];
			const height = row.length;
			for (let j = 0; j < height; j++) {
				const cell = row[j];

				body.push(<MatrixCell
					key={i * width + j}
					winrate={cell.ratio}
					mirror={cell.mirror}
					intensity={this.props.intensity}
					colors={this.props.colors}
					x={this.props.offsetX + j * this.props.edge}
					y={this.props.offsetY + i * this.props.edge}
					edge={this.props.edge}
					onClick={() => this.props.onClick && this.props.onClick(j,i)}
					onHoverStart={() => this.props.onHoverStart && this.props.onHoverStart(j,i)}
					onHoverEnd={() => this.props.onHoverEnd && this.props.onHoverEnd(j,i)}
				/>);
			}
		}

		return <g>{body}</g>;
	}

	public shouldComponentUpdate(nextProps: MatrixBodyProps, nextState: void, nextContext: any): boolean {
		if (nextProps.cells.length !== this.props.cells.length) {
			return true;
		}
		if (!_.isEqual(nextProps.cells, this.props.cells)) {
			return true;
		}
		return (
			nextProps.colors !== this.props.colors ||
			nextProps.intensity !== this.props.intensity ||
			nextProps.edge !== this.props.edge
		);
	}
}
