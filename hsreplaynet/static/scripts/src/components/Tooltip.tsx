import * as React from "react";

interface TooltipState {
	hovering?: boolean;
	clientX?: number;
}

interface TooltipProps extends React.ClassAttributes<Tooltip> {
	centered?: boolean;
	className?: string;
	content?: string | JSX.Element;
	header?: string;
	simple?: boolean;
}

export default class Tooltip extends React.Component<TooltipProps, TooltipState> {
	constructor(props: TooltipProps, state: TooltipState) {
		super(props, state);
		this.state = {
			hovering: false,
		};
	}

	render(): JSX.Element {
		let tooltip = null;
		if (this.state.hovering) {
			const tooltipClassNames = ["hsreplay-tooltip"];
			if (this.props.centered) {
				tooltipClassNames.push("centered");
			}
			else {
				const left = this.state.clientX < window.innerWidth / 2;
				if (left) {
					tooltipClassNames.push("left");
				}
				else {
					tooltipClassNames.push("right");
				}
			}
			const content = [];
			this.props.header && content.push(<h4>{this.props.header}</h4>);
			if (this.props.content) {
				if (typeof this.props.content === "string") {
					content.push(<p>{this.props.content}</p>);
				}
				else {
					content.push(this.props.content);
				}
			}
			tooltip = <div className={tooltipClassNames.join(" ")}>{content}</div>;
		}

		let classNames = ["tooltip-wrapper"];
		if (this.props.className) {
			classNames.push(this.props.className);
		}
		if (this.props.simple) {
			classNames.push("simple-tooltip");
		}

		return (
			<div
				className={classNames.join(" ")}
				onMouseEnter={(e) => this.setState({hovering: true, clientX: e.clientX})}
				onMouseLeave={() => this.setState({hovering: false})}
			>
				{this.props.children}
				{tooltip}
			</div>
		);
	}
}
