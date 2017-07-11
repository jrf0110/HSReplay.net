import * as React from "react";
import {ArchetypeData} from "../../interfaces";
import Bar, {BarDirection} from "./Bar";
import {getColorString} from "../../helpers";
import {Colors} from "../../Colors";

interface RowFooterProps extends React.ClassAttributes<RowFooter> {
	archetypeData?: ArchetypeData;
}

interface RowFooterState {
}

export default class RowFooter extends React.Component<RowFooterProps, RowFooterState> {
	render() {
		const style = {
			backgroundColor: "transparent",
		};

		const winrate = this.props.archetypeData.effectiveWinrate;
		const color = getColorString(Colors.HSREPLAY, 50, winrate / 100, false);

		style.backgroundColor = color;

		return (
			<td className="row-footer" style={style}>
				{`${winrate}%`}
			</td>
		);
	}
}
