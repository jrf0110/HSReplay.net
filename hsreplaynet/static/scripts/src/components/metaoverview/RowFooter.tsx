import * as React from "react";
import {ArchetypeData} from "../../interfaces";
import Bar, {BarDirection} from "./Bar";
import {getColorString} from "../../helpers";
import {Colors} from "../../Colors";

interface RowFooterProps extends React.ClassAttributes<RowFooter> {
	archetypeData?: ArchetypeData;
	style?: any;
}

export default class RowFooter extends React.Component<RowFooterProps, {}> {
	render() {
		const style = {
			backgroundColor: "transparent",
			...this.props.style,
		};

		const winrate = this.props.archetypeData.effectiveWinrate;
		const color = getColorString(Colors.REDORANGEGREEN, 80, winrate / 100, false);

		style.backgroundColor = color;

		return (
			<div className="row-footer" style={style}>
				{`${winrate}%`}
			</div>
		);
	}
}
