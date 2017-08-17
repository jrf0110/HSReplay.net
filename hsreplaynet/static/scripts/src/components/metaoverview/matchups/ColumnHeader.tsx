import * as React from "react";
import * as _ from "lodash";
import { ArchetypeData } from "../../../interfaces";

interface ColumnHeaderProps extends React.ClassAttributes<ColumnHeader> {
	archetypeData: ArchetypeData;
	highlight?: boolean;
	isIgnored: boolean;
	onIgnoredChanged: (ignore: boolean, ignoreClass?: boolean) => void;
	style?: any;
	onHover?: (hovering: boolean) => void;
}

interface ColumnHeaderState {
}

export default class ColumnHeader extends React.Component<ColumnHeaderProps, ColumnHeaderState> {
	shouldComponentUpdate(nextProps: ColumnHeaderProps): boolean {
		return (
			this.props.highlight !== nextProps.highlight
			|| this.props.isIgnored !== nextProps.isIgnored
			|| this.props.archetypeData.id !== nextProps.archetypeData.id
			|| !_.isEqual(this.props.style, nextProps.style)
		);
	}

	render() {
		const classNames = ["matchup-column-header matchup-column-header-archetype"];
		if (this.props.isIgnored) {
			classNames.push("ignored");
		}
		if (this.props.highlight) {
			classNames.push("highlight");
		}
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
					{this.props.archetypeData.name}
				</span>
				<span
					className="btn-toggle-class"
					onClick={(e) => {
						this.props.onIgnoredChanged(!this.props.isIgnored, true);
						e.stopPropagation();
					}}
				>
					Class
				</span>
				<img
					className="class-icon"
					src={`${STATIC_URL}images/64x/class-icons/${this.props.archetypeData.playerClass.toLowerCase()}.png`}
				/>
			</div>
		);
	}
}
