import React from "react";
import ReactDOM from "react-dom";

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
	xOffset?: number;
	onHovering?: () => void;
	noSrTooltip?: boolean;
}

export default class Tooltip extends React.Component<
	TooltipProps,
	TooltipState
> {
	tooltip: HTMLDivElement;
	tooltipContainer: Element;

	constructor(props: TooltipProps, state: TooltipState) {
		super(props, state);
		this.state = {
			clientX: 0,
			clientY: 0,
			hovering: false,
			isTouchDevice: false
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
		} else {
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
		let height = 0;
		if (this.tooltip) {
			height = this.tooltip.getBoundingClientRect().height;
			let top = this.state.clientY;
			if (!this.props.belowCursor) {
				top -= height;
			}
			top += this.props.yOffset || 0;
			style["top"] = Math.min(
				window.innerHeight - height,
				Math.max(0, top)
			);
		} else {
			style["visibility"] = "hidden";
		}
		if (this.tooltip && this.props.centered) {
			const width = this.tooltip.getBoundingClientRect().width;
			style["left"] = Math.min(
				window.innerWidth - width,
				Math.max(0, this.state.clientX - width / 2)
			);
		} else if (this.state.clientX < window.innerWidth / 2) {
			style["left"] = this.state.clientX + 20 + (this.props.xOffset || 0);
		} else {
			style["right"] =
				window.innerWidth -
				this.state.clientX +
				(this.props.xOffset || 0);
		}

		const content = [];
		this.props.header && content.push(<h4>{this.props.header}</h4>);
		if (this.props.content) {
			const selectedContent = this.getSelectedContent();
			if (typeof selectedContent === "string") {
				content.push(<p>{selectedContent}</p>);
			} else {
				content.push(selectedContent);
			}
		}

		ReactDOM.render(
			<div
				id={this.props.id}
				className={classNames.join(" ")}
				style={style}
				ref={ref => (this.tooltip = ref)}
			>
				{content}
			</div>,
			this.tooltipContainer,
			() => {
				if (
					this.tooltip &&
					this.tooltip.getBoundingClientRect().height !== height
				) {
					// re-render if this render caused a height change, to update position
					this.renderTooltip();
				}
			}
		);
	}

	render(): JSX.Element {
		const classNames = ["tooltip-wrapper"];
		if (this.props.className) {
			classNames.push(this.props.className);
		}

		const cancel = () => {
			this.tooltip = undefined;
			this.setState({ hovering: false });
		};

		const hover = e => {
			if (!this.state.hovering && this.props.onHovering) {
				this.props.onHovering();
			}
			this.setState({
				hovering: true,
				clientX: e.clientX,
				clientY: e.clientY
			});
		};

		let content = this.getSelectedContent();
		if (typeof content === "string") {
			content = <p>{content}</p>;
		}

		return (
			<div
				className={classNames.join(" ")}
				onMouseMove={hover}
				onMouseLeave={cancel}
				onTouchStart={() => this.setState({ isTouchDevice: true })}
			>
				{!this.props.noSrTooltip ? (
					<section className="sr-only">
						{this.props.header ? (
							<h1>{this.props.header}</h1>
						) : null}
						{content}
					</section>
				) : null}
				{this.props.children}
			</div>
		);
	}

	protected getSelectedContent(): TooltipContent {
		if (typeof this.props.content !== "object") {
			return this.props.content;
		}

		if (
			!this.props.content.hasOwnProperty("click") &&
			!this.props.content.hasOwnProperty("touch")
		) {
			return this.props.content as TooltipContent;
		}

		// switch based on type
		return this.props.content[this.state.isTouchDevice ? "touch" : "click"];
	}
}
