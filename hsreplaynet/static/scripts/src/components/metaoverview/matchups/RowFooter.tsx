import React from "react";
import * as _ from "lodash";
import {ArchetypeData} from "../../../interfaces";
import {getColorString} from "../../../helpers";
import {Colors} from "../../../Colors";

interface RowFooterProps extends React.ClassAttributes<RowFooter> {
	archetypeData?: ArchetypeData;
	highlight?: boolean;
	style?: any;
	onHover?: (hovering: boolean) => void;
}

export default class RowFooter extends React.Component<RowFooterProps, {}> {
	shouldComponentUpdate(nextProps: RowFooterProps): boolean {
		return (
			this.props.highlight !== nextProps.highlight
			|| this.props.archetypeData.id !== nextProps.archetypeData.id
			|| this.props.archetypeData.effectiveWinrate !== nextProps.archetypeData.effectiveWinrate
			|| !_.isEqual(this.props.style, nextProps.style)
		);
	}

	render() {
		const style = {
			backgroundColor: "transparent",
			...this.props.style,
		};

		const winrate = this.props.archetypeData.effectiveWinrate;
		const color = getColorString(Colors.REDORANGEGREEN, 80, winrate / 100, false);

		const label = isNaN(winrate) ? "-" : winrate + "%";

		style.backgroundColor = color;

		const classNames = ["row-footer"];
		if (this.props.highlight) {
			classNames.push("highlight");
		}

		return (
			<div
				className={classNames.join(" ")}
				style={style}
				onMouseEnter={() => this.props.onHover(true)}
				onMouseLeave={() => this.props.onHover(false)}
			>
				{label}
			</div>
		);
	}
}
