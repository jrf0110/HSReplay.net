import React from "react";
import * as _ from "lodash";
import { ArchetypeData } from "../../../interfaces";
import Tooltip from "../../Tooltip";
import { toTitleCase } from "../../../helpers";

interface ColumnHeaderProps extends React.ClassAttributes<ColumnHeader> {
	archetypeData: ArchetypeData;
	highlight?: boolean;
	isIgnored: boolean;
	onIgnoredChanged: (ignore: boolean, ignoreClass?: boolean) => void;
	style?: any;
	onHover?: (hovering: boolean) => void;
}

interface ColumnHeaderState {}

export default class ColumnHeader extends React.Component<
	ColumnHeaderProps,
	ColumnHeaderState
> {
	shouldComponentUpdate(nextProps: ColumnHeaderProps): boolean {
		return (
			this.props.highlight !== nextProps.highlight ||
			this.props.isIgnored !== nextProps.isIgnored ||
			this.props.archetypeData.id !== nextProps.archetypeData.id ||
			!_.isEqual(this.props.style, nextProps.style)
		);
	}

	render() {
		const { archetypeData, isIgnored } = this.props;
		const classNames = [
			"matchup-column-header matchup-column-header-archetype"
		];
		if (isIgnored) {
			classNames.push("ignored");
		}
		if (this.props.highlight) {
			classNames.push("highlight");
		}
		const tooltip =
			(isIgnored ? "Include " : "Ignore ") +
			toTitleCase(archetypeData.playerClass);
		return (
			<div
				className={classNames.join(" ")}
				onClick={() => {
					this.props.onIgnoredChanged(!this.props.isIgnored);
				}}
				style={this.props.style}
				onMouseEnter={() => this.props.onHover(true)}
				onMouseLeave={() => this.props.onHover(false)}
			>
				<span className="header-archetype-name">
					{archetypeData.name}
				</span>
				<Tooltip header={tooltip} simple={true}>
					<img
						className="class-icon"
						src={`${STATIC_URL}images/64x/class-icons/${archetypeData.playerClass.toLowerCase()}.png`}
						onClick={e => {
							this.props.onIgnoredChanged(
								!this.props.isIgnored,
								true
							);
							e.stopPropagation();
						}}
					/>
				</Tooltip>
			</div>
		);
	}
}
