import * as React from "react";

interface TooltipState {
	hovering?: boolean;
	clientX?: number;
}

interface TooltipProps extends React.ClassAttributes<Tooltip> {
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
			const style = {};
			const left = this.state.clientX < window.innerWidth / 2;
			style[left ? "left" : "right"] = 0;

			const content = [];
			this.props.header && content.push(<h4>{this.props.header}</h4>);
			this.props.content && content.push(<p>{this.props.content}</p>);
			tooltip = <div className="hsreplay-tooltip" style={style}>{content}</div>;
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
				{tooltip}
				{this.props.children}
			</div>
		);
	}
}
