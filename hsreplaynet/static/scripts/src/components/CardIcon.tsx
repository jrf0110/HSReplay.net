import * as React from "react";
import { getCardUrl, getFragments } from "../helpers";

interface CardIconProps extends React.ClassAttributes<CardIcon> {
	card: any;
	size?: number;
	mark?: string;
	markStyle?: any;
	tabIndex?: number;
}

interface CardIconState {
	clientX?: number;
	clientY?: number;
	backgroundLoaded?: boolean;
	hovering?: boolean;
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

	componentDidMount() {
		this.loadBackgroundImage();
	}

	componentWillReceiveProps(nextProps: CardIconProps) {
		if (!this.props.card || !nextProps.card && this.props.card.id !== nextProps.card.id) {
			this.loadBackgroundImage();
		}
	}

	buildBackgroundImageUrl(): string {
		return "https://art.hearthstonejson.com/v1/tiles/" + this.props.card.id + ".png";
	}

	loadBackgroundImage() {
		if (!this.props.card) {
			return;
		}
		const image = new Image();
		image.onload = () => {
			this.setState({backgroundLoaded: true});
		};
		image.src = this.buildBackgroundImageUrl();
	}

	render(): JSX.Element {
		const classNames = ["card-icon"];

		if (this.props.card) {
			const size = this.props.size || this.baseSize;
			const style: any = {
				height: size + "px",
				width: size + "px",
			};

			let mark = null;

			if (this.state.backgroundLoaded) {
				style.backgroundImage = `url(${this.buildBackgroundImageUrl()})`;
				style.backgroundPositionX = this.baseOffset * (size / this.baseSize) + "px";
				style.backgroundSize = this.baseBackgroundWidth * (size / this.baseSize) + "px " + (size - 2) + "px";

				if (this.props.mark !== undefined) {
					mark = <span style={this.props.markStyle}>{this.props.mark}</span>;
				}
			}
			else {
				classNames.push("loading");
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
							alt={this.props.card ? this.props.card.name : null}
						/>
				);
			}

			const url = getCardUrl(this.props.card) + getFragments(["gameType", "rankRange"]);

			return (
				<a href={url} tabIndex={typeof this.props.tabIndex !== "undefined" ? this.props.tabIndex : 0} className="card-icon-link">
					<div
						className={classNames.join(" ")}
						style={style}
						onMouseEnter={(e) => this.setState({hovering: true, clientX: e.clientX, clientY: e.clientY})}
						onMouseLeave={() => this.setState({hovering: false})}
						aria-label={this.props.card.name + (this.props.mark ? " " + this.props.mark : "")}
					>
						{mark}
						{tooltip}
					</div>
				</a>
			);
		}
	}
}
