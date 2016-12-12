import * as React from "react";
import {GlobalGamePlayer} from "../interfaces";
import {BnetGameType} from "../hearthstone";

export interface ClassIconProps {
	player: GlobalGamePlayer;
	tooltip?: string;
	small?: boolean;
}

export default class ClassIcon extends React.Component<ClassIconProps, any> {
	render(): JSX.Element {
		const basePath = STATIC_URL + "images/" + (this.props.small ? "64x/" : "");
		if (!this.props.player.hero_id.startsWith("HERO")) {
			return <img src={basePath + "mode-icons/mode_ai.png"} className="match-table-class-icon" />;
		}
		return <img
			src={basePath + "class-icons/" + this.props.player.hero_id.substr(0, 7) + ".png"}
			className="match-table-class-icon"
			title={this.props.tooltip}
		/>;
	}
}
