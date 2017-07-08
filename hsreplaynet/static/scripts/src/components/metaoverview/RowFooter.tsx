import * as React from "react";
import { ArchetypeData } from "../../interfaces";
import Bar from "./Bar";

interface RowFooterProps extends React.ClassAttributes<RowFooter> {
	archetypeData?: ArchetypeData;
}

interface RowFooterState {
}

export default class RowFooter extends React.Component<RowFooterProps, RowFooterState> {
	render() {
		return (
			<td>
				<Bar total={100} value={this.props.archetypeData.effectiveWinrate} />
				<br />
				{this.props.archetypeData.effectiveWinrate}%
			</td>
		);
	}
}
