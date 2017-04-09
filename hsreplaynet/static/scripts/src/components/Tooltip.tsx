import * as React from "react";

export type TooltipContent = string | JSX.Element;

export interface ClickTouch<T> {
	click: T;
	touch: T;
}

interface TooltipState {
	hovering?: boolean;
	clientX?: number;
	isTouchDevice: boolean;
}

interface TooltipProps extends React.ClassAttributes<Tooltip> {
	centered?: boolean;
	className?: string;
	content?: TooltipContent | ClickTouch<TooltipContent>;
	header?: string;
	simple?: boolean;
}

export default class Tooltip extends React.Component<TooltipProps, TooltipState> {
	constructor(props: TooltipProps, state: TooltipState) {
		super(props, state);
		this.state = {
			hovering: false,
			isTouchDevice: false,
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
				const selectedContent = this.getSelectedContent();
				if (typeof selectedContent === "string") {
					content.push(<p>{selectedContent}</p>);
				}
				else {
					content.push(selectedContent);
				}
			}
			tooltip = <div id="tooltip-body" className={tooltipClassNames.join(" ")}>{content}</div>;
		}

		let classNames = ["tooltip-wrapper"];
		if (this.props.className) {
			classNames.push(this.props.className);
		}
		if (this.props.simple) {
			classNames.push("simple-tooltip");
		}

		const cancel = () => this.setState({hovering: false});

		return (
			<div
				className={classNames.join(" ")}
				onMouseOver={(e) => this.setState({hovering: true, clientX: e.clientX})}
				onMouseOut={cancel}
				onTouchStart={() => this.setState({isTouchDevice: true})}
				aria-describedby={this.state.hovering ? "tooltip-body" : null}
			>
				{this.props.children}
				{tooltip}
			</div>
		);
	}

	protected getSelectedContent(): TooltipContent {
		if(typeof this.props.content !== "object") {
			return this.props.content;
		}

		if(!this.props.content.hasOwnProperty("click") && !this.props.content.hasOwnProperty("touch")) {
			return this.props.content as TooltipContent;
		}

		// switch based on type
		return this.props.content[this.state.isTouchDevice ? "touch" : "click"];
	}
}
