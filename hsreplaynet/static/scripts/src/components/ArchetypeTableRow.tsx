import * as React from "react";
import ClassIcon from "./ClassIcon";

interface ArchetypeTableRowProps extends React.ClassAttributes<ArchetypeTableRow> {
	archetype: string;
	heroClassName: string;
	winrate: number;
	wins: number;
	matches: number;
	selected: boolean;
	onClick: () => void;
}

export default class ArchetypeTableRow extends React.Component<ArchetypeTableRowProps, any> {
	render(): JSX.Element {
		let classNames = ["hsrtable-row"];
		let winrateCellClassNames = ["hsrtable-cell"];
		let winrate = Math.round(this.props.winrate * 100);
		let globalWinrate = 50;
		if (this.props.selected) {
			classNames.push("selected")
		}
		if (winrate >= 50) {
			classNames.push("result-won");
			winrateCellClassNames.push("result-won");
		}
		else {
			classNames.push("result-lost");
			winrateCellClassNames.push("result-lost");
		}
		return (
			<a href={"#"} className={classNames.join(" ")} onClick={() => this.props.onClick()}>
				<div className="hsrtable-cell">
					<ClassIcon heroClassName={this.props.heroClassName}/>
					<span style={{paddingLeft: "5px"}}>{this.props.archetype}</span>
					<span style={{float: "right", marginTop: "7px"}} className={"label label-" + (winrate >= 50 ? "success" : "danger")}>{winrate + "% winrate"}</span>
				</div>
			</a>
		);
	}
}
