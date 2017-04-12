import * as React from "react";

interface DateRangeSelectorProps {
	lookback: number;
	onChangeLookback?: (lookback: number) => void;
	offset: any;
	onChangeOffset?: (offset: number) => void;
	disabled?: boolean;
}

interface DateRangeSelectorState {
	selectDates?: boolean;
	maskedLookback?: boolean;
}

export default class DateRangeSelector extends React.Component<DateRangeSelectorProps, DateRangeSelectorState> {

	constructor(props: DateRangeSelectorProps, context: any) {
		super(props, context);
		this.state = {
			selectDates: false,
			maskedLookback: false,
		}
	}

	public render(): JSX.Element {
		return <div className="control-date-range-selector">
			{this.state.selectDates ? this.renderDateForm() : this.renderRelativeForm()}
		</div>;
	}

	protected renderDateForm(): JSX.Element[] {
		const from = "2016-11-01";
		const until = "2016-11-16";

		return [
			<label className="control-label">
				<span>From</span>
				<input
					type="date"
					className="form-control"
					value={from}
					required={true}
				/>
			</label>,
			<label className="control-label">
				<span>Until</span>
				<input
					type="number"
					className="form-control"
					value={until}
					required={true}
				/>
			</label>
		];
	}

	protected renderRelativeForm(): JSX.Element[] {
		const lookback = this.props.lookback;
		const offset = this.props.offset;

		return [
			<label className="control-label">
				<span>Lookback period</span>
				<span className="input-group">
					<input
						type="number"
						className="form-control"
						value={this.state.maskedLookback ? "" : "" + lookback}
						min={1}
						step={1}
						disabled={!this.canChangeLookback}
						placeholder={this.props.lookback === 1 ? "1" : null}
						required={true}
						onChange={(e: any): void => {
							if(!this.canChangeLookback) {
								return;
							}

							const number = this.sanitizeNumber(e.target.value);

							this.setState({
								maskedLookback: number === 0,
							});

							this.props.onChangeLookback(Math.max(number, 1));
						}}
					/>
					<span className="input-group-addon">{lookback === 1 ? "day" : "days"}</span>
				</span>
			</label>,
			<label className="control-label">
				<span>Last day</span>
				<span className="input-group">
					<input
						type="number"
						className="form-control"
						value={offset > 0 ? "" + offset : ""}
						min={0}
						step={1}
						disabled={!this.canChangeOffset}
						placeholder={offset === 0 ? "Today" : null}
						required={false}
						onChange={(e: any): void => {
							if(!this.canChangeOffset) {
								return;
							}
							this.props.onChangeOffset(this.sanitizeNumber(e.target.value));
						}}
					/>
					{offset > 0 ? <span className="input-group-addon">{offset === 1 ? "day" : "days"} ago</span> : null}
				</span>
			</label>
		];
	}

	private sanitizeNumber(input: any): number {
		const number = +input;
		const integer = isFinite(number) ? number : 0;
		return Math.round(integer);
	}

	protected get canChangeLookback(): boolean {
		return !!this.props.onChangeLookback && !this.props.disabled;
	}

	protected get canChangeOffset(): boolean {
		return !!this.props.onChangeOffset && !this.props.disabled;
	}
}
