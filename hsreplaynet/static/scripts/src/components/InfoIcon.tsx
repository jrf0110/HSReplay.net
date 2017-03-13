import * as React from "react";

interface InfoIconState {
	hovering?: boolean;
	isLeft?: boolean;
}

interface InfoIconProps extends React.ClassAttributes<InfoIcon> {
	content?: string | JSX.Element;
	header?: string;
	className?: string;
	iconClassName?: string;
}

export default class InfoIcon extends React.Component<InfoIconProps, InfoIconState> {
	constructor(props: InfoIconProps, state: InfoIconState) {
		super(props, state);
		this.state = {
			hovering: false,
		}
	}

	render(): JSX.Element {
		let tooltip = null;
		if (this.state.hovering) {
			let style = {};
			if (this.state.isLeft) {
				style["margin-left"] = 0;
			}

			let className = "info-icon-tooltip";
			if (this.props.className) {
				className += " " + this.props.className;
			}

			tooltip = (
				<div className={className} style={style}>
					<h4>{this.props.header}</h4>
					<p>{this.props.content}</p>
				</div>
			);
		}

		let iconClassName = "info-icon glyphicon glyphicon-question-sign";
		if (this.props.iconClassName) {
			iconClassName += " " + this.props.iconClassName;
		}

		return (
			<div
				className={iconClassName}
				onMouseEnter={(e) => this.setState({hovering: true, isLeft: e.clientX < 300})}
				onMouseLeave={() => this.setState({hovering: false})}
			>
				{tooltip}
			</div>
		);
	}
}
