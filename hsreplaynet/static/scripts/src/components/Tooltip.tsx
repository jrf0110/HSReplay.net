import * as React from "react";
import * as ReactDOM from "react-dom";
import {cloneComponent} from "../helpers";

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
	belowCursor?: boolean;
	centered?: boolean;
	className?: string;
	content?: TooltipContent | ClickTouch<TooltipContent>;
	header?: string;
	id?: string;
	noBackground?: boolean;
	simple?: boolean;
	yOffset?: number;
}

export default class Tooltip extends React.Component<TooltipProps, TooltipState> {
	tooltip: HTMLDivElement;
	tooltipContainer: Element;

	constructor(props: TooltipProps, state: TooltipState) {
		super(props, state);
		this.state = {
			clientX: 0,
			clientY: 0,
			hovering: false,
			isTouchDevice: false,
		};
	}

	componentDidUpdate() {
		if (this.state.hovering) {
			if (!this.tooltipContainer) {
				this.tooltipContainer = document.createElement("div");
				this.tooltipContainer.className = "tooltip-container";
				document.body.appendChild(this.tooltipContainer);
			}
			this.renderTooltip();
		}
		else {
			this.removeTooltipContainer();
		}
	}

	componentWillUnmount() {
		this.removeTooltipContainer();
	}

	removeTooltipContainer() {
		if (this.tooltipContainer) {
			ReactDOM.unmountComponentAtNode(this.tooltipContainer);
			document.body.removeChild(this.tooltipContainer);
			this.tooltipContainer = undefined;
		}
	}

	renderTooltip() {
		const classNames = ["hsreplay-tooltip"];
		if (this.props.noBackground) {
			classNames.push("no-background");
		}
		if (this.props.simple) {
			classNames.push("simple-tooltip");
		}

		const style = {};
		if (this.tooltip) {
			const height = this.tooltip.getBoundingClientRect().height;
			let top = this.state.clientY;
			if (!this.props.belowCursor) {
				top -= height;
			}
			top += this.props.yOffset || 0;
			style["top"] = Math.min(window.innerHeight - height, Math.max(0, top));
		}
		else {
			style["visibility"] = "hidden";
		}
		if (this.tooltip && this.props.centered) {
			const width = this.tooltip.getBoundingClientRect().width;
			style["left"] = Math.min(window.innerWidth - width, Math.max(0, this.state.clientX - width / 2));
		}
		else if (this.state.clientX < window.innerWidth / 2) {
			style["left"] = this.state.clientX + 20;
		}
		else {
			style["right"] = window.innerWidth - this.state.clientX;
		}

		const content = [];
		this.props.header && content.push(<h4>{this.props.header}</h4>);
		if (this.props.content) {
			let selectedContent = this.getSelectedContent();
			if (typeof selectedContent === "string") {
				content.push(<p>{selectedContent}</p>);
			}
			else {
				if (!Array.isArray(selectedContent)) {
					selectedContent = [selectedContent];
				}
				const components = selectedContent.map((component) => {
					return cloneComponent(component, {onUpdated: () => this.tooltip && this.renderTooltip()});
				});

				content.push(components);
			}
		}

		ReactDOM.render((
			<div
				id={this.props.id}
				className={classNames.join(" ")}
				style={style}
				ref={(ref) => this.tooltip = ref}
			>
				{content}
			</div>
		), this.tooltipContainer);
	}

	render(): JSX.Element {
		let classNames = ["tooltip-wrapper"];
		if (this.props.className) {
			classNames.push(this.props.className);
		}

		const cancel = () => {
			this.tooltip = undefined;
			this.setState({hovering: false});
		};

		return (
			<div
				className={classNames.join(" ")}
				onMouseMove={(e) => this.setState({hovering: true, clientX: e.clientX, clientY: e.clientY})}
				onMouseLeave={cancel}
				onTouchStart={() => this.setState({isTouchDevice: true})}
				aria-describedby={this.state.hovering ? this.props.id : null}
			>
				{this.props.children}
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
