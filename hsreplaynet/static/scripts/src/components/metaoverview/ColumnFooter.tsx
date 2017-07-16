import * as React from "react";
import Bar, {BarDirection} from "./Bar";
import {ArchetypeData} from "../../interfaces";

interface ColumnFooterProps extends React.ClassAttributes<ColumnFooter> {
	archetypeData: ArchetypeData;
	highlight?: boolean;
	max?: number;
	style?: any;
	customWeight: number;
	useCustomWeight: boolean;
	onCustomWeightChanged: (popularity: number) => void;
	onHover?: (hovering: boolean) => void;
	onInputFocus?: (focus: boolean) => void;
}

interface ColumnFooterState {
	text?: string;
}

export default class ColumnFooter extends React.Component<ColumnFooterProps, ColumnFooterState> {
	constructor(props: ColumnFooterProps, state: ColumnFooterState) {
		super();
		this.state = {
			text: "" + props.customWeight,
		};
	}

	componentWillReceiveProps(nextProps: ColumnFooterProps) {
		if (nextProps.useCustomWeight) {
			this.setState({text: "" + nextProps.customWeight});
		}
	}

	render() {
		let element = null;
		if (this.props.useCustomWeight) {
			element = (
				<input
					className="input-popularity"
					key={this.props.archetypeData.id}
					type="text"
					value={this.state.text}
					onChange={(event) => this.setState({text: event.target.value})}
					onFocus={(event: any) => {
						event.target.select();
						this.props.onInputFocus(true);
					}}
					onBlur={(event) => {
						this.onCustomPopularityChanged(event);
						this.props.onInputFocus(false);
					}}
					onKeyPress={(event) => {
						if (event.which === 13) {
							this.onCustomPopularityChanged(event);
						}
					}}
				/>
			);
		}

		const classNames = ["matchup-column-footer"];
		if (this.props.highlight) {
			classNames.push("highlight");
		}

		const value = this.props.useCustomWeight ? this.props.customWeight : this.props.archetypeData.popularityTotal;

		return (
			<div
				className={classNames.join(" ")}
				style={this.props.style}
				onMouseEnter={() => this.props.onHover(true)}
				onMouseLeave={() => this.props.onHover(false)}
			>
				<Bar
					total={this.props.max ? this.props.max : 100}
					value={value}
					direction={BarDirection.VERTICAL}
					label={`${this.props.archetypeData.popularityTotal}%`}
					valueElement={element}
				/>
			</div>
		);
	}

	onCustomPopularityChanged(event: any) {
		const value = event.target.value;
		const n = value === "" ? 0 : parseFloat(value);
		if (!isNaN(n) && isFinite(n)) {
			this.props.onCustomWeightChanged(n);
		}
	}
}
