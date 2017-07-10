import * as React from "react";

export type TooltipContent = string | JSX.Element | JSX.Element[];

export interface ClickTouch<T> {
	click: T;
	touch: T;
}

interface TooltipState {
	hovering?: boolean;
	clientX?: number;
	clientY?: number;
	isTouchDevice: boolean;
}

interface TooltipProps {
	centered?: boolean;
	className?: string;
	content?: TooltipContent | ClickTouch<TooltipContent>;
	header?: string;
	simple?: boolean;
	noBackground?: boolean;
}

export default class Tooltip extends React.Component<TooltipProps, TooltipState> {
	tooltip: HTMLDivElement;

	constructor(props: TooltipProps, state: TooltipState) {
		super(props, state);
		this.state = {
			clientX: 0,
			clientY: 0,
			hovering: false,
			isTouchDevice: false,
		};
	}

	render(): JSX.Element {
		let tooltip = null;
		if (this.state.hovering) {
			const tooltipStyle = {};
			const tooltipClassNames = ["hsreplay-tooltip"];
			if (this.props.noBackground) {
				tooltipClassNames.push("no-background");
			}
			if (this.props.centered) {
				tooltipClassNames.push("centered");
			}
			else {
				if (this.tooltip) {
					tooltipStyle["top"] = Math.max(0, this.state.clientY - this.tooltip.getBoundingClientRect().height);
				}
				else {
					tooltipStyle["visibility"] = "hidden";
				}
				const left = this.state.clientX < window.innerWidth / 2;
				if (left) {
					tooltipStyle["left"] = (this.state.clientX + 20) + "px";
				}
				else {
					tooltipStyle["right"] = (window.innerWidth - this.state.clientX) + "px";
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
			tooltip = (
				<div
					id="tooltip-body"
					className={tooltipClassNames.join(" ")}
					style={tooltipStyle}
					ref={(ref) => this.tooltip = ref}
				>
					{content}
				</div>
			);
		}

		let classNames = ["tooltip-wrapper"];
		if (this.props.className) {
			classNames.push(this.props.className);
		}
		if (this.props.simple) {
			classNames.push("simple-tooltip");
		}

		const cancel = () => {
			this.tooltip = undefined;
			this.setState({hovering: false});
		};

		return (
			<div
				className={classNames.join(" ")}
				onMouseMove={(e) => this.setState({hovering: true, clientX: e.clientX, clientY: e.clientY})}
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
		if (typeof this.props.content !== "object") {
			return this.props.content;
		}

		if (!this.props.content.hasOwnProperty("click") && !this.props.content.hasOwnProperty("touch")) {
			return this.props.content as TooltipContent;
		}

		// switch based on type
		return this.props.content[this.state.isTouchDevice ? "touch" : "click"];
	}
}
