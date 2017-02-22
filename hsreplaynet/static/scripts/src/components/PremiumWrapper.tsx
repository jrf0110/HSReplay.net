import * as React from "react";
import * as ReactDOM from "react-dom";
import {showModal} from "../Premium";

interface PremiumWrapperProps extends React.ClassAttributes<PremiumWrapper> {
	isPremium?: boolean;
}

export default class PremiumWrapper extends React.Component<PremiumWrapperProps, any> {
	private touchCount: number = 0;
	
	render(): JSX.Element {
		let info = null;
		if (!this.props.isPremium) {
			info = (
				<div className="premium-info">
					<h4>Premium only</h4>
					<span>Click here for more info!</span>
				</div>
			);
		}
		return (
			<div
				className="premium-wrapper"
				onTouchStart={() => this.touchCount++}
				onClick={(e) => (this.touchCount % 2 === 0) && !this.props.isPremium && showModal()}
				onMouseEnter={() => !this.props.isPremium && this.setState({showInfo: true, fadeOut: false})}
				onMouseLeave={() => {
					if(!this.props.isPremium) {
						this.touchCount = 0;
						this.setState({fadeOut: true});
					}
				}}
			>
				<img className="premium-icon" src={STATIC_URL + "images/ranked-medals/Medal_Ranked_Legend.png"} />
				{info}
				{this.props.children}
			</div>
		);
	}
}
