import * as React from "react";
import * as _ from "lodash";

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

		const elements = _.map(this.props.distributions, (value: number, key: string) => {
			return [key, value];
		});

		const distributions = _.sortBy(elements, (tuple: any[]) => {
			const value = tuple[1];
			return 1 - value;
		});

		const rows = _.map(distributions, (tuple: any[]) => {
			const key = tuple[0];
			const value = tuple[1];
			return (
				<tr key={count}>
					<th>{++count}</th>
					<th>{key}</th>
					<td>{(value * 100).toFixed(2)}%</td>
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
