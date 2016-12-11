import * as React from "react";
import {GlobalGamePlayer} from "../interfaces";
import {BnetGameType} from "../hearthstone";

export interface ClassIconProps {
	player: GlobalGamePlayer;
	tooltip?: string;
}

export default class ClassIcon extends React.Component<ClassIconProps, any> {
	render(): JSX.Element {
		if (!this.props.player.hero_id.startsWith("HERO")) {
			return <img src={STATIC_URL + "/images/mode_ai.png"} className="match-table-class-icon" />;
		}
		return <img
			src={STATIC_URL + "/images/class-icons/" + this.props.player.hero_id.substr(0, 7) + ".png"}
			className="match-table-class-icon"
			title={this.props.tooltip}
		/>;
	}
}
