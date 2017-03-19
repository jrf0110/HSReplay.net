import * as React from "react";
import { getCardUrl } from "../helpers";

interface CardTileProps extends React.ClassAttributes<CardTile> {
	card: any;
	count: number;
	customText?: string;
	disableTooltip?: boolean;
	height?: number;
	hideGem?: boolean;
	rarityColored?: boolean;
	noLink?: boolean;
	urlGameType?: string;
}

interface CardTileState {
	clientX?: number;
	clientY?: number;
	hovering?: boolean;
}

export default class CardTile extends React.Component<CardTileProps, CardTileState> {
	constructor(props: CardTileProps, state: CardTileState) {
		super(props, state);
		this.state = {
			clientX: 0,
			clientY: 0,
			hovering: false,
		};
	}

	public render(): JSX.Element {
		const baseHeight = 34;
		const baseCountWidth = 24;
		const baseImageWidth = 134;

		let showCountBox = this.props.count > 1 || this.props.card.rarity === "LEGENDARY";
		let countWidth = this.props.height / baseHeight * baseCountWidth;

		let tileStyle = {height: this.props.height + "px", lineHeight: this.props.height + "px"};
		let gemStyle = {width: this.props.height + "px"};
		let costStyle = {fontSize: this.props.height / baseHeight * 1.25 + "em"};
		let nameStyle = {fontSize: this.props.height / baseHeight * 0.9 + "em", width: "calc(100% - " + ((showCountBox ? countWidth : 0) + 4) + "px)"};

		let imageWidth = this.props.height / baseHeight * baseImageWidth;
		let imageRight = showCountBox ? (this.props.height / baseHeight * baseCountWidth - 2) + "px" : "0";
		let imageStyle = {width: imageWidth + "px", right: imageRight};

		let countBox = null;
		if (showCountBox) {
			let singleLegendary = this.props.card.rarity === "LEGENDARY" && this.props.count === 1;
			let countboxStyle = {width: countWidth + "px"};
			let countStyle = {fontSize: this.props.height / baseHeight * 1.15 + "em", top: singleLegendary ? "-2px" : 0};

			countBox = (
				<div className="card-countbox" style={countboxStyle}>
					<span className="card-count" style={countStyle}>{singleLegendary ? "★" : this.props.count}</span>
				</div>
			);
		}

		let gem = null;
		if (!this.props.hideGem) {
			const gemClassNames = ["card-gem"];

			if (this.props.rarityColored) {
				gemClassNames.push("rarity-" + (this.props.card.rarity || "free").toLowerCase());
			}

			gem = (
				<div className={gemClassNames.join(" ")} style={gemStyle}>
					<span className="card-cost" style={costStyle}>{this.props.card.cost}</span>
				</div>
			);
		}

		let tooltip = null;
		if (!this.props.disableTooltip && this.state.hovering) {
			const imageStyle = {
				top: Math.max(0, this.state.clientY - 350) + "px",
			};
			const left = this.state.clientX < window.innerWidth / 2;
			if (left) {
				imageStyle["left"] = (this.state.clientX + 20) + "px";
			}
			else {
				imageStyle["right"] = (window.innerWidth - this.state.clientX) + "px";
			}

			tooltip = (
					<img
						className="card-image"
						height={350}
						src={"https://art.hearthstonejson.com/v1/render/latest/enUS/256x/" + this.props.card.id + ".png"}
						style={imageStyle}
					/>
			);
		}

		let url = null;
		if (!this.props.noLink) {
			url = getCardUrl(this.props.card);
			if (this.props.urlGameType) {
				url += "#gameType=" + this.props.urlGameType;
			}
		}

		return (
			<a href={url}>
				<div
					className="card-tile"
					style={tileStyle}
					onMouseMove={(e) => this.setState({hovering: true, clientX: e.clientX, clientY: e.clientY})}
					onMouseLeave={() => this.setState({hovering: false})}
				>
					{tooltip}
					{gem}
					<div className="card-frame">
						<img className="card-asset" src={"https://art.hearthstonejson.com/v1/tiles/" + this.props.card.id + ".png"} style={imageStyle}/>
						{countBox}
						<span className={"card-fade-" + (showCountBox ? "countbox" : "no-countbox")} />
						<span className="card-name" style={nameStyle}>{this.props.customText || this.props.card.name}</span>
					</div>
				</div>
			</a>
		);
	}
}
