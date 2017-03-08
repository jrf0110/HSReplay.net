import * as React from "react";
import * as ReactDOM from "react-dom";
import InfoIcon from "./InfoIcon";
import {showModal} from "../Premium";

interface PremiumWrapperProps extends React.ClassAttributes<PremiumWrapper> {
	isPremium?: boolean;
	iconStyle?: any;
	infoHeader?: string;
	infoContent?: string;
}

interface PremiumWrapperState {
	hovering?: boolean;
	triggered?: boolean; // inferred hover
	touchCount?: number;
}

const key = "hsreplaynet_premium_wrappers";

export default class PremiumWrapper extends React.Component<PremiumWrapperProps, PremiumWrapperState> {

	constructor(props: PremiumWrapperProps, context: any) {
		super(props, context);
		this.state = {
			hovering: false,
			touchCount: 0,
		};
	}

	public trigger() {
		this.setState({
			triggered: true,
			touchCount: 0,
		});
	}

	public release() {
		this.setState({triggered: false});
	}

	componentDidMount() {
		// register to global list of premium wrappers
		if (typeof window[key] === "undefined") {
			window[key] = [];
		}
		window[key].push(this);
	}

	componentWillUnmount() {
		window[key] = window[key].filter((component: PremiumWrapper) => component != this);
	}

	componentWillUpdate(nextProps: PremiumWrapperProps, nextState: PremiumWrapperState) {
		if (nextState.hovering === this.state.hovering) {
			return;
		}
		// hover is starting or ending
		window[key].forEach((wrapper: PremiumWrapper) => {
			if (wrapper === this) {
				return;
			}
			if (nextState.hovering) {
				wrapper.trigger();
			}
			else {
				wrapper.release();
			}
		});
	}

	render(): JSX.Element {
		let infoIcon = null;
		if (this.props.infoHeader) {
			infoIcon = <InfoIcon
				header={this.props.infoHeader}
				content={this.props.infoContent}
			/>;
		}

		const classNames = ["premium-wrapper"];
		if (this.shouldAppear()) {
			classNames.push("visible");
		}
		if (this.state.hovering || this.state.triggered) {
			classNames.push("hovering");
		}

		return (
			<div
				className={classNames.join(" ")}
				onTouchStart={() => this.setState({hovering: true, touchCount: this.state.touchCount + 1})}
				onTouchCancel={() => this.setState({hovering: false})}
				onClick={(e) => {
					if(!this.shouldAppear()) {
						return;
					}
					if(this.state.touchCount % 2 === 1) {
						return;
					}
					showModal();
				}}
				onMouseEnter={() => this.setState({hovering: true})}
				onMouseLeave={() => this.setState({hovering: false, touchCount: 0})}
			>
				<img
					className="premium-icon"
					src={STATIC_URL + "images/ranked-medals/Medal_Ranked_Legend.png"}
					style={this.props.iconStyle}
				/>
				{infoIcon}
				<div className="premium-info">
					<h4><span className="text-premium">Premium</span> only</h4>
					{this.state.touchCount > 0 ? <span>Tap for more details…</span> : null}
				</div>
				{this.props.children}
			</div>
		);
	}

	protected shouldAppear() {
		return !this.props.isPremium;
	}
}
