import * as React from "react";
import Tooltip from "./Tooltip";
import { toTitleCase } from "../helpers";

export interface ClassIconProps {
	heroClassName: string;
	small?: boolean;
	tooltip?: boolean;
}

export default class ClassIcon extends React.Component<ClassIconProps, any> {
	private readonly classes = ["druid", "hunter", "mage", "paladin", "priest", "rogue", "shaman", "warlock", "warrior"];

	render(): JSX.Element {
		const basePath = STATIC_URL + "images/" + (this.props.small ? "64x/" : "");
		const heroClassName = this.props.heroClassName.toLowerCase();
		let image = null;
		if (this.classes.indexOf(heroClassName) === -1) {
			image = <img src={basePath + "mode-icons/mode_ai.png"} className="class-icon" alt={heroClassName}/>;
		}
		else {
			image = (
				<img
					src={basePath + "class-icons/" + heroClassName + ".png"}
					className="class-icon"
					alt={heroClassName}
				/>
			);
		}
		if (this.props.tooltip) {
			image = (
				<Tooltip content={toTitleCase(this.props.heroClassName)} simple>
					{image}
				</Tooltip>
			);
		}
		return image;
	}
}
