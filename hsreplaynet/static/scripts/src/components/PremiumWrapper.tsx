import * as React from "react";
import * as ReactDOM from "react-dom";
import {showModal} from "../Premium";

interface PremiumWrapperProps extends React.ClassAttributes<PremiumWrapper> {
	isPremium?: boolean;
}

export default class PremiumWrapper extends React.Component<PremiumWrapperProps, any> {
	
	render(): JSX.Element {
		let info = null;
		if (!this.props.isPremium) {
			info = (
				<div className="premium-info">
					<h4>Premium</h4>
					<span>Click here for more info!</span>
				</div>
			);
		}
		return (
			<div
				className="premium-wrapper"
				onClick={(e) => !this.props.isPremium && showModal()}
				onMouseEnter={() => !this.props.isPremium && this.setState({showInfo: true, fadeOut: false})}
				onMouseLeave={() => !this.props.isPremium && this.setState({fadeOut: true})}
			>
				<img className="premium-icon" src={STATIC_URL + "images/ranked-medals/Medal_Ranked_Legend.png"} />
				{info}
				{this.props.children}
			</div>
		);
	}
}
