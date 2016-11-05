import * as React from "react";
import $ from "jquery";

interface DistributionProps extends React.ClassAttributes<Distribution> {
	distributions: NumberDistribution;
	title?: string;
	value?: string;
}

interface NumberDistribution {
	[key: string]: number;
}

interface DistributionState {
}

export default class Distribution extends React.Component<DistributionProps, DistributionState> {

	public render(): JSX.Element {
		let count = 0;
		const rows = $.map(this.props.distributions, (value: number, key: string) => {
			return (
				<tr>
					<th>{++count}</th>
					<th>{key}</th>
					<td>{Math.round(value * 100 * 100) / 100}%</td>
				</tr>
			);
		});

		return (
			<table className="table table-condensed table-hover">
				<thead>
					<tr>
						<th>#</th>
						<th>{this.props.title || "Title"}</th>
						<th>{this.props.value || "Value"}</th>
					</tr>
				</thead>
				<tbody>
					{rows}
				</tbody>
			</table>
		);
	}
}
