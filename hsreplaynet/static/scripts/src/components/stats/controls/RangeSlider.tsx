import * as React from "react";

interface RangeSliderProps extends React.ClassAttributes<RangeSlider> {
	min: number;
	max: number;
	step?: number;
	low: number;
	onChangeLow?: (low: number) => void;
	high: number;
	onChangeHigh?: (high: number) => void;
	minDistance?: number;
}

const enum DragState {
	NONE,
	TBD,
	LOW,
	HIGH,
	BOTH,
}

interface RangeSliderState {
	dragging?: DragState;
	initialRow?: number|null;
	initialLow?: number|null;
	initialHigh?: number|null;
}

export default class RangeSlider extends React.Component<RangeSliderProps, RangeSliderState> {

	private endHandler: () => void;
	private moveHandler: (e: any) => void;
	private ref: any;

	constructor(props: RangeSliderProps, context: any) {
		super(props, context);

		this.state = {
			dragging: DragState.NONE,
			initialRow: null,
			initialLow: null,
			initialHigh: null,
		};
		this.endHandler = () => {
			this.setState({
				dragging: DragState.NONE,
				initialRow: null,
				initialLow: null,
				initialHigh: null,
			});
		};
		this.moveHandler = (e: any) => {
			const rect = this.ref.getBoundingClientRect();
			const y = e.clientY;
			const offset = y - rect.top;
			const height = rect.height;

			let row = Math.floor(this.range / height * offset);
			row = Math.min(row, this.props.max);
			row = Math.max(row, this.props.min);

			this.handleRow(row);
		};
	}

	public handleRow(row: number) {
		switch (this.state.dragging) {
			case DragState.LOW:
				if (this.props.onChangeLow) {
					this.props.onChangeLow(row);
				}
				return;
			case DragState.HIGH:
				if (this.props.onChangeHigh) {
					this.props.onChangeHigh(row);
				}
				return;
			case DragState.BOTH:
				if (this.state.initialRow === null) {
					this.setState({
						initialRow: row,
						initialLow: this.props.low,
						initialHigh: this.props.high,
					});
					return;
				}
				const distance = this.state.initialHigh - this.state.initialLow;
				const difference = row - this.state.initialRow;
				let proposedLow = this.state.initialLow + difference;
				let proposedHigh = this.state.initialHigh + difference;
				if (proposedLow < this.props.min) {
					proposedLow = this.props.min;
					proposedHigh = this.props.min + distance;
				}
				else if (proposedHigh > this.props.max) {
					proposedLow = this.props.max - distance;
					proposedHigh = this.props.max;
				}
				this.props.onChangeLow(proposedLow);
				this.props.onChangeHigh(proposedHigh);
				return;
			case DragState.TBD:
				if (row < this.props.low) {
					this.props.onChangeLow(row);
					this.setState({
						dragging: DragState.LOW,
					});
				}
				else if (row > this.props.low) {
					this.props.onChangeHigh(row);
					this.setState({
						dragging: DragState.HIGH,
					});
				}
				return;
		}
	}

	public componentDidMount(): void {
		document.addEventListener("mousemove", this.moveHandler);
		document.addEventListener("mouseup", this.endHandler);
	}

	public componentWillUnmount(): void {
		document.removeEventListener("mousemove", this.moveHandler);
		document.removeEventListener("mouseup", this.endHandler);
	}

	public render(): JSX.Element {
		const sections = [];

		const createOnDrag = (dragState: DragState) => {
			return (e: any, i?: number) => {
				this.setState({dragging: dragState});
				e.preventDefault();
				if (typeof i === "number") {
					setTimeout(() => this.handleRow(i), 0);
				}
			}
		};

		const onDragLow = createOnDrag(DragState.LOW);
		const onDragHigh = createOnDrag(DragState.HIGH);
		const onDragBoth = createOnDrag(DragState.BOTH);
		const onDragTbd = createOnDrag(DragState.TBD);

		const distance = Math.abs(this.props.high - this.props.low);

		for (let i = this.props.min; i <= this.props.max; i += this.props.step || 1) {
			let classNames = [];
			let onDrag = null;

			if (i === this.props.low && i === this.props.high) {
				onDrag = onDragTbd;
			}
			else if (i <= this.props.low) {
				onDrag = onDragLow;
			}
			else if (i >= this.props.high) {
				onDrag = onDragHigh;
			}
			else if (i > this.props.low && i < this.props.high) {
				onDrag = onDragBoth;
			}

			if (i === this.props.low) {
				classNames.push("low");
			}

			if (i === this.props.high) {
				classNames.push("high");
			}

			if (i > this.props.low && i < this.props.high) {
				if (this.state.dragging === DragState.BOTH) {
					classNames.push("active");
				}
				else {
					classNames.push("selection");
				}
			}

			sections.push(<section
				className={classNames.join(" ")}
				style={{height: 100 / this.range + "%"}}
				onMouseDown={(e) => onDrag(e, i)}
			/>);
		}

		const low = this.props.low;
		const high = this.props.high;

		const classNames = ["control-range-slider"];

		if (this.state.dragging !== DragState.NONE) {
			classNames.push("dragging");
		}

		return <div
			className={classNames.join(" ")}
			ref={(ref: any) => this.ref = ref}
		>
			{<div className="control-range-slider-range">
				{sections}
			</div>}
		</div>;
	}

	public shouldComponentUpdate(nextProps: RangeSliderProps, nextState: RangeSliderState, nextContext: any): boolean {
		if (this.state.dragging !== DragState.NONE &&
			nextState.dragging === this.state.dragging &&
			nextProps.low === this.props.low &&
			nextProps.high === this.props.high
		) {
			return false;
		}
		return true;
	}

	private get range(): number {
		return Math.abs(this.props.max - this.props.min);
	}
}
