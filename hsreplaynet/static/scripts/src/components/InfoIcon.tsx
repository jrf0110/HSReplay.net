import * as React from "react";

interface InfoIconState {
	hovering?: boolean;
	isLeft?: boolean;
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
			let style = {};
			if (this.state.isLeft) {
				style["margin-left"] = 0;
			}

			tooltip = (
				<div className="info-icon-text" style={style} >
					<h4>{this.props.header}</h4>
					{this.props.content}
				</div>
			);
		}

		return (
			<div 
				className="info-icon glyphicon glyphicon-question-sign"
				onMouseEnter={(e) => this.setState({hovering: true, isLeft: e.clientX < 300})}
				onMouseLeave={() => this.setState({hovering: false})}
			>
				{tooltip}
			</div>
		);
	}
}
