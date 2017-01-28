import * as React from "react";
import {GlobalGamePlayer} from "../interfaces";
import {BnetGameType} from "../hearthstone";

export interface ClassIconProps {
	heroClassName: string;
	tooltip?: string;
	small?: boolean;
}

export default class ClassIcon extends React.Component<ClassIconProps, any> {
	private readonly classes = ["druid", "hunter", "mage", "paladin", "priest", "rogue", "shaman", "warlock", "warrior"];

	render(): JSX.Element {
		const basePath = STATIC_URL + "images/" + (this.props.small ? "64x/" : "");
		const heroClassName = this.props.heroClassName.toLowerCase();
		if (this.classes.indexOf(heroClassName) === -1) {
			return <img src={basePath + "mode-icons/mode_ai.png"} className="hsrtable-class-icon" />;
		}
		return <img
			className="match-table-class-icon"
			src={basePath + "class-icons/" + heroClassName + ".png"}
			title={this.props.tooltip}
		/>;
	}
}
