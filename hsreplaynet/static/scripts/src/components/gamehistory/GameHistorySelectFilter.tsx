import React from "react";

interface GameHistorySelectFilterProps {
	default: string;
	options: [string, string][];
	onChanged: (type: string) => void;
	selected: string;
}

interface GameHistorySelectFilterState {}

export default class GameHistorySelectFilter extends React.Component<
	GameHistorySelectFilterProps,
	GameHistorySelectFilterState
> {
	render(): JSX.Element {
		const options = [];
		this.props.options.forEach(o =>
			options.push(<option value={o[0]}>{o[1]}</option>)
		);
		return (
			<select
				className="form-control"
				onChange={(e: any) => this.props.onChanged(e.target.value)}
				value={this.props.selected || ""}
			>
				<option value="">{this.props.default}</option>
				{options}
			</select>
		);
	}
}
