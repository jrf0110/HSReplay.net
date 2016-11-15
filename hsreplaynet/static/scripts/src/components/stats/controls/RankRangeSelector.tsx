import * as React from "react";

interface RankRangeSelectorProps extends React.ClassAttributes<RankRangeSelector> {
	smallest?: number;
	onChangeSmallest?: (smallest: number) => void;
	largest?: number;
	onChangeLargest?: (largest: number) => void;
	disabled?: boolean;
}

interface RankRangeSelectorState {
	smallest?: number;
	largest?: number;
	instantCommit?: boolean;
}

/**
 * Allows the selection of a rank range, from a smallest rank or legend
 *
 */
export default class RankRangeSelector extends React.Component<RankRangeSelectorProps, RankRangeSelectorState> {

	private timeout: number|null;

	constructor(props: RankRangeSelectorProps, context: any) {
		super(props, context);
		this.state = {
			smallest: null,
			largest: null,
			instantCommit: true,
		}
		this.timeout = null;
	}

	public render(): JSX.Element {
		const smallest = this.state.smallest !== null ? this.state.smallest : this.props.smallest;
		const largest = this.state.largest !== null ? this.state.largest : this.props.largest;

		return <div className="control-rank-range-selector">
			<label className="control-label">
				<span>Rank</span>
				<input
					type="number"
					className="form-control"
					value={smallest === 0 ? "" : ""+smallest}
					placeholder={smallest === 0 ? "Legend" : null}
					disabled={!this.canChangeSmallest}
					onChange={(e: any): void => {
						if(!this.canChangeSmallest) {
							return;
						}
						let smallest = this.cleanRank(e.target.value);
						if(!this.canChangeLargest && smallest > largest) {
							// if we can't change largest, clamp to it
							smallest = largest;
						}
						this.setState({
							smallest: smallest,
						});
					}}
					onFocus={() => this.focus()}
					onBlur={() => this.blur()}
					onKeyDown={(e) => this.keyDown(e, true)}
				/>
			</label>
			<label className="control-label">
				<span>Rank</span>
				<input
					type="number"
					className="form-control"
					value={largest === 0 ? "" : "" + largest}
					placeholder={smallest === 0 ? "Legend" : null}
					disabled={!this.canChangeLargest}
					onChange={(e: any): void => {
						if(!this.canChangeLargest) {
							return;
						}
						let largest = this.cleanRank(e.target.value);
						if(!this.canChangeSmallest && largest < smallest) {
							// if we can't change smallest, clamp to it
							largest = smallest;
						}
						this.setState({
							largest: largest,
						});
					}}
					onFocus={() => this.focus()}
					onBlur={() => this.blur()}
					onKeyDown={(e) => this.keyDown(e, false)}
				/>
			</label>
		</div>;
	}

	protected cleanRank(input: any): number {
		const number = +input;
		const integer = isFinite(number) ? number : 0;
		const rank = Math.min(Math.max(integer, 0), 25);
		return rank;
	}

	protected get canChangeSmallest(): boolean {
		return !!this.props.onChangeSmallest && !this.props.disabled;
	}

	protected get canChangeLargest(): boolean {
		return !!this.props.onChangeLargest && !this.props.disabled;
	}

	protected componentDidUpdate(prevProps: RankRangeSelectorProps, prevState: RankRangeSelectorState, prevContext: any): void {
		if ((this.state.smallest !== null && this.state.smallest !== prevState.smallest) ||
			(this.state.largest !== null && this.state.largest !== prevState.largest)) {
			if (this.state.instantCommit) {
				this.commit();
			}
			else {
				this.clearTimeout();
				this.timeout = window.setTimeout(() => this.commit(), this.state.smallest + this.state.largest > 0 ? 400 : 1000);
			}
		}

		if (this.state.smallest !== null && this.state.smallest >= 3 && this.state.smallest > prevState.smallest) {
			this.commit();
		}

		if (this.state.largest !== null && this.state.largest >= 3 && this.state.largest > prevState.largest) {
			this.commit();
		}
	}

	protected keyDown(e: any, smallest: boolean) {
		switch (e.keyCode) {
			case 8: // Backspace
				if ((smallest && this.state.largest === 0) || (!smallest && this.state.smallest === 0)) {
					this.commit();
				}
				break;
			case 27: // Escape
				this.rollback();
				break;
			case 76: // L
				if (smallest) {
					this.commit(0, null);
				}
				else {
					this.commit(null, 0);
				}
				break;
		}
	}

	protected focus(): void {
		this.setState({
			instantCommit: false,
		});
	}

	protected blur(): void {
		this.setState({
			instantCommit: true,
		});
		this.commit();
	}

	protected rollback(): void {
		this.setState({
			smallest: this.props.smallest,
			largest: this.props.largest,
		});
	}

	private clearTimeout(): void {
		if (this.timeout === null) {
			return;
		}
		clearTimeout(this.timeout);
		this.timeout = null;
	}

	protected commit(customSmallest?: number, customLargest?: number): void {
		this.clearTimeout();

		let smallest = typeof customSmallest === "number" ? customSmallest : this.state.smallest;
		let largest = typeof customLargest === "number" ? customLargest : this.state.largest;

		if (largest !== null && largest < this.props.smallest) {
			smallest = largest;
		}

		if (smallest !== null && smallest !== this.props.smallest && this.canChangeSmallest) {
			this.props.onChangeSmallest(+smallest);
		}

		if (smallest !== null && smallest > this.props.largest) {
			// we're trying to change smallest, but need to shift largest
			largest = smallest;
		}

		if (largest !== null && largest !== this.props.largest && this.canChangeLargest) {
			this.props.onChangeLargest(+largest);
		}

		this.setState({
			smallest: null,
			largest: null,
		})
	}

}
