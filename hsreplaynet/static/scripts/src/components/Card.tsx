import * as React from "react";

interface CardProps extends React.ClassAttributes<Card> {
	id: string;
	x?: number;
	y?: number;
}

export default class Card extends React.Component<CardProps, void> {
	render(): JSX.Element {
		const imageStyle = {
			top: Math.max(0, this.props.y - 350) + "px",
		};
		const left = this.props.x < window.innerWidth / 2;
		if (left) {
			imageStyle["left"] = (this.props.x + 20) + "px";
		}
		else {
			imageStyle["right"] = (window.innerWidth - this.props.x) + "px";
		}

		return (
			<img
				className="card-image"
				height={350}
				src={"https://art.hearthstonejson.com/v1/render/latest/enUS/256x/" + this.props.id + ".png"}
				style={imageStyle}
			/>
		);
	}
}
