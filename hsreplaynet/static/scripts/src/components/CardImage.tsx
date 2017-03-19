import * as React from "react";
import { getCardUrl } from "../helpers";

interface CardImageState {
	url: string;
}

interface CardImageProps extends React.ClassAttributes<CardImage> {
	card: any;
	placeholder: string;
}

export default class CardImage extends React.Component<CardImageProps, CardImageState> {
	constructor(props: CardImageProps, state: CardImageState) {
		super(props, state);
		this.state = {
			url: props.placeholder,
		};
		this.fetchImage();
	}

	fetchImage() {
		const url = "https://art.hearthstonejson.com/v1/render/latest/enUS/256x/" + this.props.card.id + ".png";
		const image = new Image();
		image.onload = () => this.setState({url});
		image.src = url;
	}

	render(): JSX.Element {
		return (
			<a className="card-image" href={getCardUrl(this.props.card)}>
				<img src={this.state.url} height={350}/>
			</a>
		);
	}
}
