import React from "react";
import CardTile from "../CardTile";

interface AnimatedListItemProps
	extends React.ClassAttributes<AnimatedListItem> {
	index: number;
	height: number;
}

export default class AnimatedListItem extends React.Component<
	AnimatedListItemProps,
	{}
> {
	render(): JSX.Element {
		const { height, index } = this.props;
		return (
			<div className="animated-list-item" style={{ top: height * index }}>
				{this.props.children}
			</div>
		);
	}
}
