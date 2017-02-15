import * as React from "react";

interface InfoIconState {
	hovering?: boolean;
}

interface InfoIconProps extends React.ClassAttributes<InfoIcon> {
	content?: string | JSX.Element;
	header?: string;
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
			tooltip = (
				<div className="info-icon-text">
					<h4>{this.props.header}</h4>
					{this.props.content}
				</div>
			);
		}
		return (
			<div 
				className="info-icon glyphicon glyphicon-question-sign"
				onMouseEnter={() => this.setState({hovering: true})}
				onMouseLeave={() => this.setState({hovering: false})}
			>
				{tooltip}
			</div>
		);
	}
}
