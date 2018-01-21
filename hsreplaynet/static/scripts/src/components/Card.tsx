import React from "react";

interface CardProps {
	id: string;
	x?: number;
	y?: number;
}

interface CardState {
	loaded?: boolean;
}

export default class Card extends React.Component<CardProps, CardState> {
	constructor(props, context) {
		super(props, context);
		this.state = {
			loaded: false,
		}
	}

	componentDidUpdate(prevProps: CardProps, prevState: CardState) {
		if(prevProps.id !== this.props.id) {
			this.setState({loaded: false});
		}
	}

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

		const artUrl = "https://art.hearthstonejson.com/v1/render/latest/enUS/256x/" + this.props.id + ".png";

		return (
			<div>
				<img
					style={{visibility: "hidden"}}
					src={artUrl}
					height={0}
					width={0}
					onLoad={() => {
						this.setState({loaded: true})
					}}
				/>
				<img
					className="card-image"
					height={350}
					src={this.state.loaded ? artUrl : "https://hsreplay.net/static/images/loading_minion.png"}
					style={imageStyle}
				/>
			</div>
		);
	}
}
