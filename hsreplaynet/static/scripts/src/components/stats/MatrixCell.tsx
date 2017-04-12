import * as React from "react";
import {Colors} from "../../Colors";
import {getColorString} from "../../helpers";

interface MatrixCellProps {
	winrate: number,
	mirror: boolean;
	intensity: number,
	colors: Colors,
	x: number;
	y: number;
	edge: number;
	disable?: boolean;
	onClick?: () => void;
	onHoverStart?: () => void;
	onHoverEnd?: () => void;
}

interface MatrixCellState {
}

export default class MatrixCell extends React.Component<MatrixCellProps, MatrixCellState> {

	public render(): JSX.Element {
		const cellColor = getColorString(
			this.props.colors, this.props.intensity, this.props.winrate,
			this.props.mirror, this.props.disable
		);
		const style = {
			fill: cellColor,
		};

		const classNames = [];
		if (this.props.onClick) {
			classNames.push("selectable");
		}

		return <g
			className={classNames.join(" ")}
			onClick={(e) => {
				if(this.props.onClick) {
					this.props.onClick();
				}
				e.preventDefault();
			}}
			onMouseDown={(e) => {
				e.preventDefault();
			}}
			onMouseEnter={(e) => this.props.onHoverStart && this.props.onHoverStart()}
			onMouseLeave={(e) => this.props.onHoverEnd && this.props.onHoverEnd()}
		>
			<rect
				x={this.props.x}
				y={this.props.y}
				width={this.props.edge}
				height={this.props.edge}
				style={style}
			/>
		</g>;
	}

	public shouldComponentUpdate(nextProps: MatrixCellProps, nextState: MatrixCellState, nextContext: any): boolean {
		return (
			this.props.winrate !== nextProps.winrate ||
			this.props.mirror !== nextProps.mirror ||
			this.props.intensity !== nextProps.intensity ||
			this.props.colors !== nextProps.colors ||
			this.props.x !== nextProps.x ||
			this.props.y !== nextProps.y ||
			this.props.edge !== nextProps.edge ||
			this.props.disable !== nextProps.disable
		);
	}
}
