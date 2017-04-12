import * as React from "react";
import { getCardUrl } from "../helpers";

interface CardIconState {
	clientX?: number;
	clientY?: number;
	hovering?: boolean;
}

interface CardIconProps {
	card: any;
	urlGameType: string;
	size?: number;
	mark?: string;
	markStyle?: any;
	tabIndex?: number;
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
		};
	}

	render(): JSX.Element {
		if (this.props.card) {
			const size = this.props.size || this.baseSize;
			const style = {
				backgroundImage: "url(https://art.hearthstonejson.com/v1/tiles/" + this.props.card.id + ".png)",
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
					bottom: Math.min(this.state.clientY - 350, 0),
				};
				const left = this.state.clientX < window.innerWidth / 2;
				imageStyle[left ? "left" : "right"] = "40px";

				tooltip = (
						<img
							className="card-image"
							height={350}
							src={"https://art.hearthstonejson.com/v1/render/latest/enUS/256x/" + this.props.card.id + ".png"}
							style={imageStyle}
							onMouseEnter={() => this.setState({hovering: false})}
						/>
				);
			}

			let url = getCardUrl(this.props.card);
			if (this.props.urlGameType) {
				url += "#gameType=" + this.props.urlGameType;
			}

			return (
				<a href={url} tabIndex={typeof this.props.tabIndex !== "undefined" ? this.props.tabIndex : 0} className="card-icon-link">
					<div
						className="card-icon"
						style={style}
						onMouseEnter={(e) => this.setState({hovering: true, clientX: e.clientX, clientY: e.clientY})}
						onMouseLeave={() => this.setState({hovering: false})}
					>
						{mark}
						{tooltip}
					</div>
				</a>
			);
		}
	}
}
