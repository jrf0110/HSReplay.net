import * as React from "react";
import $ from "jquery";

interface MatrixProps extends React.ClassAttributes<Matrix> {
	matrix: NumberMatrix;
}

interface NumberMatrix {
	[key: string]: NumberRow;
}

interface NumberRow {
	[key: string]: number;
}

interface MatrixState {
}

export default class Matrix extends React.Component<MatrixProps, MatrixState> {

	public render(): JSX.Element {
		let rowcount = 0;
		const archetypes = Object.keys(this.props.matrix);
		const rows = $.map(archetypes, (key: string) => {
			const class1 = key;
			const row: NumberRow = this.props.matrix[key];
			let cellcount = 0;
			const cells = $.map(archetypes, (key: string) => {
				const class2 = key;
				const matchup: any = row[key];
				const winrate = matchup ? (matchup.f_wr_vs_o).toFixed(2) + "%" : "unknown";
				const style = {
					backgroundColor: "hsl(" + (matchup ? Math.round(matchup.f_wr_vs_o) : 50) + ", 100%, 50%)",
				};
				return <td key={cellcount++} title={class1 + " vs " + class2 + String.fromCharCode(10) + "Winrate: " + winrate} style={style}></td>;
			});
			return (
				<tr key={rowcount++}>
					<th style={{height: "20px"}}>{key}</th>
					{cells}
				</tr>
			);
		});

		const headers = [<th></th>].concat($.map(archetypes, (key: string) => {
			return <th style={{width: "20px", overflow: "hidden", whiteSpace: "nowrap"}}>{key}</th>;
		}));

		return (
			<table className="table table-condensed table-hover table-bordered" style={{fontSize: "0.7em", tableLayout: "fixed"}}>
				{headers}
				{rows}
			</table>
		);
	}
}
