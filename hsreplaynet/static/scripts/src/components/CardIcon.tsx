import * as React from "react";

interface CardIconState {
	clientX?: number;
	clientY?: number;
	hovering?: boolean;
}

interface CardIconProps extends React.ClassAttributes<CardIcon> {
	cardId: string;
	size?: number;
	mark?: string;
	markStyle?: any;
}

export default class CardIcon extends React.Component<CardIconProps, CardIconState> {
	readonly baseSize = 34;
	readonly baseBackgroundWidth = 126;
	readonly baseOffset = -70;

	constructor(props: CardIconProps, state: CardIconState) {
		super(props, state);
		this.state = {
			clientX: 0,
			clientY: 0,
			hovering: false,
		}
	}

	render(): JSX.Element {
		if (this.props.cardId) {
			const size = this.props.size || this.baseSize;
			const style = {
				backgroundImage: "url(https://art.hearthstonejson.com/v1/tiles/" + this.props.cardId + ".png)",
				backgroundPositionX: this.baseOffset * (size / this.baseSize) + "px",
				backgroundSize: this.baseBackgroundWidth * (size / this.baseSize) + "px " + (size - 2) + "px",
				height: size + "px",
				width: size + "px",
			};

			let mark = null;
			if (this.props.mark !== undefined) {
				mark = <span style={this.props.markStyle}>{this.props.mark}</span>;
			}

			let tooltip = null;
			if (this.state.hovering) {
				const imageStyle = {
					bottom: Math.min(this.state.clientY - 350, 0)
				};
				const left = this.state.clientX < window.innerWidth / 2;
				imageStyle[left ? "left" : "right"] = "40px";

				tooltip = (
						<img
							className="card-image"
							height={350}
							src={"http://media.services.zam.com/v1/media/byName/hs/cards/enus/" + this.props.cardId + ".png"}
							style={imageStyle}
							onMouseEnter={() => this.setState({hovering: false})}
						/>
				);
			}

			return (
				<div
					className="card-icon"
					style={style}
					onMouseEnter={(e) => this.setState({hovering: true, clientX: e.clientX, clientY: e.clientY})}
					onMouseLeave={() => this.setState({hovering: false})}
				>
					{mark}
					{tooltip}
				</div>
			);
		}
	}
}
